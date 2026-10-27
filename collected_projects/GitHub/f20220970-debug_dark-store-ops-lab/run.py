"""Run the dark-store study on Instacart data.

    python run.py --data ../qcommerce-retention-sql/data      # folder with the Instacart CSVs
Outputs: results/*.csv, results/summary.md, charts/*.png
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

import duckdb  # noqa: E402
import matplotlib  # noqa: E402
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

import capacity as Q  # noqa: E402
import config as C  # noqa: E402
import layout as L  # noqa: E402
import replenishment as R  # noqa: E402


def load(data: Path):
    con = duckdb.connect()
    p = lambda f: (data / f).as_posix()
    for f in ["orders.csv", "order_products__prior.csv", "products.csv", "departments.csv"]:
        if not (data / f).exists():
            raise SystemExit(f"Missing {data / f}. Point --data at the Instacart CSV folder.")
    skus = con.execute(f"""
        SELECT op.product_id, d.department, COUNT(*) AS picks
        FROM read_csv_auto('{p('order_products__prior.csv')}') op
        JOIN read_csv_auto('{p('products.csv')}') pr USING (product_id)
        JOIN read_csv_auto('{p('departments.csv')}') d USING (department_id)
        GROUP BY 1, 2 ORDER BY picks DESC LIMIT {C.SKUS_CARRIED}""").df()
    total_lines = con.execute(f"SELECT COUNT(*) FROM read_csv_auto('{p('order_products__prior.csv')}')").fetchone()[0]
    con.register("carried", skus[["product_id"]])
    lines = con.execute(f"""
        WITH sample AS (
            SELECT order_id FROM read_csv_auto('{p('orders.csv')}')
            WHERE eval_set = 'prior' ORDER BY hash(order_id) LIMIT {C.SAMPLE_ORDERS})
        SELECT op.order_id, op.product_id
        FROM read_csv_auto('{p('order_products__prior.csv')}') op
        JOIN sample USING (order_id) JOIN carried USING (product_id)""").df()
    hours = con.execute(f"""SELECT CAST(order_hour_of_day AS INTEGER) AS hour, COUNT(*) AS orders
        FROM read_csv_auto('{p('orders.csv')}') GROUP BY 1 ORDER BY 1""").df()
    return skus, lines, hours, total_lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "data"))
    a = ap.parse_args()
    skus, lines, hours, total_lines = load(Path(a.data))
    coverage = skus["picks"].sum() / total_lines
    skus = R.abc(skus)

    layouts = {"category (baseline)": L.slot_by_category(skus),
               "velocity within category": L.slot_velocity_within_category(skus),
               "pure velocity": L.slot_by_velocity(skus)}
    results = {k: L.measure(v, lines) for k, v in layouts.items()}
    perf = pd.DataFrame([{"layout": k, "orders": len(r), "avg_lines": r["lines"].mean(),
                          "avg_metres": r["metres"].mean(), "p90_metres": r["metres"].quantile(0.9),
                          "avg_pick_seconds": r["seconds"].mean()} for k, r in results.items()]).round(1)
    base = perf.iloc[0]
    perf["walk_saving_pct"] = (100 * (1 - perf["avg_metres"] / base["avg_metres"])).round(1)
    perf["time_saving_pct"] = (100 * (1 - perf["avg_pick_seconds"] / base["avg_pick_seconds"])).round(1)

    hours["share"] = hours["orders"] / hours["orders"].sum()
    hours["store_orders"] = hours["share"] * C.DAILY_ORDERS
    staff = hours[["hour", "store_orders"]].copy()
    for _, row in perf.iterrows():
        staff[row["layout"]] = [Q.pickers_needed(o, row["avg_pick_seconds"]) if o > 0.5 else 0 for o in staff["store_orders"]]
    picker_hours = {k: int(staff[k].sum()) for k in perf["layout"]}

    avg_lines = perf.iloc[0]["avg_lines"]
    rep = R.min_max(skus, C.DAILY_ORDERS * avg_lines)
    by_class = rep.groupby("abc").agg(skus=("product_id", "size"), share_of_picks=("picks", "sum"),
                                      avg_min=("min_units", "mean"), avg_max=("max_units", "mean")).reset_index()
    by_class["share_of_picks"] = (by_class["share_of_picks"] / rep["picks"].sum()).round(3)

    (ROOT / "results").mkdir(exist_ok=True); (ROOT / "charts").mkdir(exist_ok=True)
    perf.to_csv(ROOT / "results/layout_comparison.csv", index=False)
    staff.round(2).to_csv(ROOT / "results/staffing_by_hour.csv", index=False)
    rep.head(50).round(2).to_csv(ROOT / "results/min_max_top50.csv", index=False)
    by_class.round(1).to_csv(ROOT / "results/abc_summary.csv", index=False)

    fig, ax = plt.subplots(figsize=(9, 4))
    for k, c in zip(results, ["#9DB4C0", "#2C7A7B", "#1F3A5F"]):
        ax.hist(results[k]["metres"], bins=50, alpha=.55, label=k, color=c)
    ax.set_xlabel("Pick-path distance per order (m)"); ax.set_ylabel("orders"); ax.legend()
    ax.set_title("Walking distance per order by slotting policy"); fig.tight_layout(); fig.savefig(ROOT / "charts/pick_distance.png", dpi=120); plt.close(fig)
    fig, ax = plt.subplots(figsize=(10, 4))
    w = 0.28
    for i, k in enumerate(perf["layout"]):
        ax.bar(staff["hour"] + (i - 1) * w, staff[k], w, label=k)
    ax.set_xlabel("Hour of day"); ax.set_ylabel("pickers needed"); ax.legend()
    ax.set_title(f"Pickers needed per hour ({C.DAILY_ORDERS} orders/day, {int(C.SLA_TARGET*100)}% start within {C.SLA_WAIT_SECONDS}s)")
    fig.tight_layout(); fig.savefig(ROOT / "charts/staffing_by_hour.png", dpi=120); plt.close(fig)
    cum = rep["picks"].cumsum() / rep["picks"].sum()
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(np.arange(1, len(cum) + 1), 100 * cum, color="#2C7A7B")
    ax.set_xlabel("SKUs ranked by picks"); ax.set_ylabel("% of picks"); ax.set_title("Pick concentration (ABC)")
    fig.tight_layout(); fig.savefig(ROOT / "charts/abc_curve.png", dpi=120); plt.close(fig)

    v_mid, v_best = perf.iloc[1], perf.iloc[2]
    a_row = by_class.set_index("abc").loc["A"]
    lines_md = [
        "# Results summary", "",
        f"- Store range: top {C.SKUS_CARRIED:,} SKUs cover {100 * coverage:.0f}% of all Instacart pick lines; "
        f"{int(a_row.skus)} A-class SKUs ({100 * a_row.skus / len(rep):.0f}% of the range) take {100 * a_row.share_of_picks:.0f}% of picks.",
        f"- Measured on {int(base.orders):,} real orders ({base.avg_lines:.1f} lines each within the range).",
        f"- Walking per order: {base.avg_metres:.0f} m with category slotting; {v_mid.avg_metres:.0f} m with velocity-within-category "
        f"({v_mid.walk_saving_pct:.0f}% less); {v_best.avg_metres:.0f} m with pure velocity slotting ({v_best.walk_saving_pct:.0f}% less).",
        f"- Pick time per order: {base.avg_pick_seconds:.0f} s → {v_mid.avg_pick_seconds:.0f} s → {v_best.avg_pick_seconds:.0f} s "
        f"({v_mid.time_saving_pct:.0f}% and {v_best.time_saving_pct:.0f}% faster).",
        f"- Staffing at {C.DAILY_ORDERS:,} orders/day, {int(C.SLA_TARGET * 100)}% of orders starting within {C.SLA_WAIT_SECONDS} s: "
        + ", ".join(f"{k}: {v} picker-hours/day" for k, v in picker_hours.items()) + ".",
        f"- Replenishment (1-day lead time, daily review, ~95% service): A-class SKUs average min {a_row.avg_min:.0f} / max {a_row.avg_max:.0f} units.",
    ]
    (ROOT / "results/summary.md").write_text("\n".join(lines_md) + "\n")
    print("\n".join(lines_md))


if __name__ == "__main__":
    main()
