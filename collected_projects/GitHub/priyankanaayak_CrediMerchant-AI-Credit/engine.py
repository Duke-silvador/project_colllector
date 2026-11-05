import json
import sqlite3
from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape
import numpy as np
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

DB_FILE = "merchant_credit.db"

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

FAIRNESS_NOTE = (
    "This score uses ONLY the merchant's own cash-flow data and the loan being requested. "
    "It does not use gender, religion, caste, age, or location. A low score is a signal to "
    "look closer (smaller amount, seasonal repayment, more data) – it is never an automatic "
    "rejection. A human lender makes the final decision."
)

def money(x):
    return f"Rs. {x:,.0f}"

def _connect():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def q(sql, params=()):
    conn = _connect()
    try:
        return conn.execute(sql, params).fetchall()
    finally:
        conn.close()

def ex(sql, params=()):
    conn = _connect()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()

def init_db():
    conn = _connect()
    try:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS merchants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT, owner_name TEXT, business_type TEXT, city TEXT,
            years_in_business REAL, requested_amount REAL, tenure_months INTEGER,
            interest_rate REAL, consent_data INTEGER, consent_share INTEGER, consent_privacy INTEGER,
            consent_at TEXT, created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id INTEGER, tx_date TEXT, description TEXT, amount REAL
        );
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_id INTEGER, created_at TEXT, score INTEGER, band TEXT,
            result_json TEXT, decision TEXT, decision_notes TEXT, decided_at TEXT
        );
        """)
        conn.commit()
    finally:
        conn.close()

def save_merchant(f):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return ex(
        """INSERT INTO merchants (business_name, owner_name, business_type, city,
        years_in_business, requested_amount, tenure_months, interest_rate,
        consent_data, consent_share, consent_privacy, consent_at, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (f["business_name"], f["owner_name"], f["business_type"], f["city"],
         f["years_in_business"], f["requested_amount"], f["tenure_months"],
         f["interest_rate"], 1, 1, 1, now, now)
    )

def get_merchant(mid):
    rows = q("SELECT * FROM merchants WHERE id=?", (mid,))
    return dict(rows[0]) if rows else None

def delete_merchant(mid):
    for table, col in (("transactions", "merchant_id"), ("assessments", "merchant_id"), ("merchants", "id")):
        ex(f"DELETE FROM {table} WHERE {col}=?", (mid,))

def save_transactions(mid, df):
    conn = _connect()
    try:
        conn.execute("DELETE FROM transactions WHERE merchant_id=?", (mid,))
        rows = [(mid, d.strftime("%Y-%m-%d"), str(desc), float(a))
                for d, desc, a in zip(df["date"], df["description"], df["amount"])]
        conn.executemany(
            "INSERT INTO transactions (merchant_id, tx_date, description, amount) VALUES (?,?,?,?)", rows)
        conn.commit()
    finally:
        conn.close()

def load_transactions(mid):
    conn = _connect()
    try:
        df = pd.read_sql_query(
            "SELECT tx_date AS date, description, amount FROM transactions "
            "WHERE merchant_id=? ORDER BY tx_date", conn, params=(mid,))
    finally:
        conn.close()
    if not df.empty:
        df["date"] = pd.to_datetime(df["date"])
    return df

def save_assessment(mid, result):
    return ex(
        "INSERT INTO assessments (merchant_id, created_at, score, band, result_json) VALUES (?,?,?,?,?)",
        (mid, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), int(result["score"]),
         result["band"], json.dumps(result))
    )

def latest_assessment(mid):
    rows = q("SELECT * FROM assessments WHERE merchant_id=? ORDER BY id DESC LIMIT 1", (mid,))
    if not rows:
        return None
    row = dict(rows[0])
    row["result"] = json.loads(row["result_json"])
    return row

def save_decision(assessment_id, decision, notes):
    ex("UPDATE assessments SET decision=?, decision_notes=?, decided_at=? WHERE id=?",
       (decision, notes, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), assessment_id))

def clean_upload(raw):
    df = raw.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    if "date" not in df.columns or "amount" not in df.columns:
        raise ValueError("Your file needs columns named 'date' and 'amount' (and optionally 'description').")
    if "description" not in df.columns:
        df["description"] = ""
    start_rows = len(df)
    s = df["date"].astype(str).str.strip()
    d = pd.to_datetime(s, errors="coerce", format="%Y-%m-%d")
    missing = d.isna()
    if missing.any():
        d[missing] = pd.to_datetime(s[missing], errors="coerce", dayfirst=True)
    df["date"] = d
    df["amount"] = pd.to_numeric(
        df["amount"].astype(str).str.replace(r"[^\d.\-]", "", regex=True),
        errors="coerce")
    df["description"] = df["description"].fillna("").astype(str)
    df = df.dropna(subset=["date", "amount"])
    df = df[df["amount"] != 0]
    dropped = start_rows - len(df)
    return df[["date", "description", "amount"]].reset_index(drop=True), dropped

def generate_demo_data(seed=42, months=18, end="2026-10-31"):
    rng = np.random.default_rng(seed)
    end = pd.Timestamp(end)
    start = (end - pd.DateOffset(months=months)) + pd.Timedelta(days=1)
    season = {1: .9, 2: .85, 3: .95, 4: 1.0, 5: 1.0, 6: 0.8, 7: .75, 8: .85, 9: 1.0, 10: 1.5, 11: 1.4, 12: 1.2}
    rows, week_sales = [], 0.0
    for day in pd.date_range(start, end):
        sale = 4000 * season[day.month] * (1 + 0.008 * (day.day / 30)) * rng.lognormal(0, 0.21)
        rows.append((day, "Daily shop sales (UPI/cash)", round(sale, 2)))
        week_sales += sale
        if day.weekday() == 6:
            rows.append((day, "Stock purchase supplier", -round(week_sales * rng.uniform(0.52, 0.62), 2)))
            week_sales = 0.0
        if day.day == 1:
            rows.append((day, "Shop rent", -15000.0))
        if day.day == 5:
            rows.append((day, "Staff salary", -12000.0))
        if day.day == 10:
            rows.append((day, "Electricity & utilities", -round(rng.uniform(2500, 3800), 2)))
        if day.day == 20:
            rows.append((day, "Transport & misc expenses", -round(rng.uniform(2000, 5000), 2)))
    return pd.DataFrame(rows, columns=["date", "description", "amount"])

def monthly_summary(tx):
    tx = tx.copy()
    tx["month"] = tx["date"].dt.to_period("M")
    inflow = tx[tx["amount"] > 0].groupby("month")["amount"].sum()
    outflow = -tx[tx["amount"] < 0].groupby("month")["amount"].sum()
    idx = pd.period_range(tx["month"].min(), tx["month"].max(), freq="M")
    out = pd.DataFrame({"inflow": inflow.reindex(idx, fill_value=0.0),
                        "outflow": outflow.reindex(idx, fill_value=0.0)})
    out["net"] = out["inflow"] - out["outflow"]
    out.index.name = "month"
    out = out.reset_index()
    out["label"] = out["month"].astype(str)
    out["month_num"] = out["month"].dt.month
    return out

def seasonality_table(monthly):
    if len(monthly) < 12:
        return None
    overall = monthly["inflow"].mean()
    if overall <= 0:
        return None
    by_month = monthly.groupby("month_num")["inflow"].mean() / overall
    return pd.DataFrame({"month": [MONTH_NAMES[m-1] for m in by_month.index],
                         "index": by_month.round(2).values})

def emi(principal, annual_rate, months):
    r = annual_rate / 1200.0
    if r == 0:
        return principal / months
    return principal * r * ((1 + r) ** months) / (((1 + r) ** months) - 1)

def loan_from_emi(monthly_payment, annual_rate, months):
    r = annual_rate / 1200.0
    if r == 0:
        return monthly_payment * months
    return monthly_payment * (((1 + r) ** months) - 1) / (r * ((1 + r) ** months))

def assess(m, monthly):
    n = len(monthly)
    if n < 3:
        raise ValueError("At least 3 months of data are needed for an assessment.")
    inflow = monthly["inflow"].to_numpy(float)
    net = monthly["net"].to_numpy(float)
    avg_in = float(inflow.mean())
    avg_out = float(monthly["outflow"].mean())
    avg_net = float(net.mean())
    margin = avg_net / avg_in if avg_in > 0 else -1.0
    cv = float(inflow.std() / avg_in) if avg_in > 0 else 9.9
    slope = float(np.polyfit(np.arange(n), inflow, 1)[0])
    trend_pct = (slope / avg_in) * 100 if avg_in > 0 else 0.0

    conservative = max(0.0, float(np.percentile(net, 25)))
    affordable_emi = conservative * 0.5
    req_emi = float(emi(m["requested_amount"], m["interest_rate"], m["tenure_months"]))
    dscr = conservative / req_emi if req_emi > 0 else 0.0
    max_loan = float(loan_from_emi(affordable_emi, m["interest_rate"], m["tenure_months"]))
    weak_months = int((net < req_emi).sum())

    factors = []
    pts = 25 if cv < .15 else 20 if cv < .30 else 14 if cv < .45 else 8 if cv < .60 else 3
    factors.append({"name": "Sales stability", "points": pts, "max": 25,
                    "detail": f"Monthly sales vary by about {cv*100:.0f}% around the average ({money(avg_in)}). Steadier sales = higher points."})

    pts = 25 if margin >= .25 else 20 if margin >= .15 else 14 if margin >= .08 else 8 if margin >= .03 else 4 if margin > 0 else 0
    factors.append({"name": "Cash margin", "points": pts, "max": 25,
                    "detail": f"On average {margin*100:.1f}% of money coming in is left over after expenses ({money(avg_net)} per month)."})

    pts = 20 if trend_pct >= 2 else 15 if trend_pct >= 0 else 10 if trend_pct >= -2 else 5 if trend_pct >= -5 else 0
    direction = "growing" if trend_pct > 0.5 else "shrinking" if trend_pct < -0.5 else "flat"
    factors.append({"name": "Business trend", "points": pts, "max": 20,
                    "detail": f"Monthly sales are {direction} by about {trend_pct:+.1f}% per month on average."})

    pts = 20 if dscr >= 2 else 15 if dscr >= 1.5 else 10 if dscr >= 1.2 else 5 if dscr >= 1 else 0
    factors.append({"name": "Repayment capacity", "points": pts, "max": 20,
                    "detail": f"Requested EMI is {money(req_emi)}/month. In a cautious month the business keeps about {money(conservative)}, which covers the EMI {dscr:.2f} times. In {weak_months} of {n} months, leftover cash was below the EMI."})

    pts = 10 if n >= 12 else 7 if n >= 6 else 4
    factors.append({"name": "Data history", "points": pts, "max": 10,
                    "detail": f"{n} months of data provided. More months = more confidence in the picture (12+ months shows a full seasonal cycle)."})

    score = int(sum(f["points"] for f in factors))
    band = "Low risk" if score >= 70 else "Medium risk" if score >= 50 else "High risk"
    if band == "Low risk" and dscr < 1.0:
        band = "Medium risk"

    seas = seasonality_table(monthly)
    seasonal_list = []
    if seas is None:
        seasonal_note = "Less than 12 months of data, so seasonality cannot be measured. Ask for a longer history if possible."
    else:
        seasonal_list = seas.to_dict("records")
        peak = seas.loc[seas["index"].idxmax()]
        low = seas.loc[seas["index"].idxmin()]
        if peak["index"] >= 1.4 or low["index"] <= 0.7:
            seasonal_note = f"Seasonal business: busiest in {peak['month']} ({peak['index']:.2f}x average) and slowest in {low['month']} ({low['index']:.2f}x average). Consider lighter repayments in slow months."
        else:
            seasonal_note = "No strong seasonality detected; sales are fairly even through the year."

    if band == "Low risk":
        rec = "Cash flow supports the requested loan. Standard lender review is suggested."
    elif band == "Medium risk":
        rec = f"Consider approving with conditions: a smaller amount (about {money(max_loan)} fits the cautious-month budget) or a repayment schedule lighter in slow months."
    else:
        rec = f"Refer for MANUAL review – do not auto-decline. Consider a smaller amount (about {money(max_loan)}), a longer tenure, or asking for more data."

    return {
        "score": score, "band": band, "factors": factors,
        "months": n, "period": f"{monthly['label'].iloc[0]} to {monthly['label'].iloc[-1]}",
        "avg_inflow": avg_in, "avg_outflow": avg_out, "avg_net": avg_net,
        "margin": margin, "cv": cv, "trend_pct": trend_pct,
        "conservative_surplus": conservative, "affordable_emi": affordable_emi,
        "requested_emi": req_emi, "dscr": dscr, "max_affordable_loan": max_loan,
        "weak_months": weak_months, "seasonal_note": seasonal_note,
        "seasonality": seasonal_list, "recommendation": rec,
        "requested_amount": float(m["requested_amount"]),
        "tenure_months": int(m["tenure_months"]), "interest_rate": float(m["interest_rate"]),
        "monthly": [{"month": r.label, "inflow": float(r.inflow), "outflow": float(r.outflow), "net": float(r.net)}
                    for r in monthly.itertuples()]
    }

def build_pdf(m, row):
    a = row["result"]
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=1.5*cm, bottomMargin=1.5*cm, title="Merchant Credit Assessment Report")
    st = getSampleStyleSheet()

    def P(text, style="BodyText"):
        return Paragraph(escape(str(text)), st[style])

    def T(data, widths, header=True):
        cells = [[P(c) for c in r] for r in data]
        t = Table(cells, colWidths=widths, repeatRows=1 if header else 0)
        style = [("GRID", (0,0), (-1,-1), 0.4, colors.grey), ("VALIGN", (0,0), (-1,-1), "TOP")]
        if header:
            style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EEF7")))
        t.setStyle(TableStyle(style))
        return t

    band_color = {"Low risk": "#1B8A3C", "Medium risk": "#C77700", "High risk": "#B3261E"}[a["band"]]

    els = [
        P("Merchant Credit Assessment Report", "Title"),
        P(f"Generated: {datetime.now():%d %b %Y %H:%M} | Report for lender review – not an automatic decision"),
        Spacer(1, 10)
    ]
    els += [
        P("1. Merchant details", "Heading2"),
        T([["Business", m["business_name"]], ["Owner", m["owner_name"]],
           ["Type / City", f"{m['business_type']} / {m['city']}"],
           ["Years in business", f"{m['years_in_business']:.1f}"],
           ["Loan requested", f"{money(m['requested_amount'])} for {m['tenure_months']} months at {m['interest_rate']}% per year"],
           ["Consent recorded", f"Yes ({m['consent_at']}) (data use, sharing with lender, privacy terms)"]],
          [4*cm, 13*cm], header=False),
        Spacer(1, 8)
    ]
    els += [
        P("2. Risk result", "Heading2"),
        Paragraph(f'<font color="{band_color}"><b>Score {a["score"]}/100 ({a["band"]})</b></font>', st["Heading3"]),
        P(f"Data period: {a['period']} ({a['months']} months)"),
        Spacer(1, 4),
        T([["Factor", "Points", "Why"]] + [[f["name"], f"{f['points']}/{f['max']}", f["detail"]] for f in a["factors"]], [3.5*cm, 2*cm, 11.5*cm]),
        Spacer(1, 8)
    ]
    els += [
        P("3. Repayment capacity", "Heading2"),
        T([["Average monthly money in", money(a["avg_inflow"])],
           ["Average monthly money out", money(a["avg_outflow"])],
           ["Average monthly net cash", money(a["avg_net"])],
           ["Cautious-month surplus (25th percentile)", money(a["conservative_surplus"])],
           ["Requested EMI", money(a["requested_emi"])],
           ["EMI coverage (cautious surplus / EMI)", f"{a['dscr']:.2f}x"],
           ["Affordable EMI (50% of cautious surplus)", money(a["affordable_emi"])],
           ["Suggested maximum loan on these terms", money(a["max_affordable_loan"])]],
          [9*cm, 8*cm], header=False),
        Spacer(1, 8)
    ]
    els += [P("4. Seasonality", "Heading2"), P(a["seasonal_note"]), Spacer(1, 4)]
    if a["seasonality"]:
        els.append(T([["Month"] + [s["month"] for s in a["seasonality"]],
                      ["Index"] + [f"{s['index']:.2f}" for s in a["seasonality"]]],
                     [1.6*cm] + [1.28*cm] * len(a["seasonality"])))
        els.append(Spacer(1, 8))

    els += [
        P("5. Last 12 months of cash flow", "Heading2"),
        T([["Month", "Money in", "Money out", "Net"]] +
          [[r["month"], money(r["inflow"]), money(r["outflow"]), money(r["net"])]
           for r in a["monthly"][-12:]], [3*cm, 4.7*cm, 4.7*cm, 4.6*cm]),
        Spacer(1, 8)
    ]
    els += [
        P("6. Suggested next step", "Heading2"), P(a["recommendation"]), Spacer(1, 6),
        P("Fairness & limits", "Heading3"), P(FAIRNESS_NOTE), Spacer(1, 8),
        P("7. Lender decision", "Heading2")
    ]

    if row.get("decision"):
        els.append(T([["Decision", row["decision"]],
                      ["Notes", row.get("decision_notes") or "-"],
                      ["Recorded at", row.get("decided_at") or "-"]],
                     [4*cm, 13*cm], header=False))
    else:
        els.append(P("No decision recorded yet."))

    doc.build(els)
    return buf.getvalue()
