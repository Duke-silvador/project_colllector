
import csv
from pathlib import Path

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
PLOTS = RUNS / "plots"
PLOTS.mkdir(parents=True, exist_ok=True)


def load_csv(filename):
    path = RUNS / filename
    with path.open("r", newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def plot_signal(data, filename, column, ylabel, title, disturbance=False):
    time = [float(row["time_s"]) for row in data]
    values = [float(row[column]) for row in data]

    plt.figure(figsize=(10, 5))
    plt.plot(time, values, label=column)
    if disturbance:
        plt.axvline(10, linestyle="--", label="Steam demand step at 10 s")

    plt.xlabel("Time (s)")
    plt.ylabel(ylabel)
    plt.title(title)
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS / filename, dpi=160)
    plt.close()


def main():
    nominal = load_csv("nominal.csv")
    disturbed = load_csv("steam_demand_step.csv")

    plot_signal(
        nominal, "nominal_level.png", "drum_level_pct",
        "Drum level (%)", "Nominal Boiler Drum Level"
    )
    plot_signal(
        disturbed, "disturbed_level.png", "drum_level_pct",
        "Drum level (%)", "Drum Level Under Steam-Demand Disturbance", True
    )
    plot_signal(
        disturbed, "disturbed_inventory.png", "inventory_pu",
        "Inventory (pu)", "Water Inventory Under Steam-Demand Disturbance", True
    )
    plot_signal(
        disturbed, "disturbed_pressure.png", "pressure_pu",
        "Pressure (pu)", "Pressure Under Steam-Demand Disturbance", True
    )

    plt.figure(figsize=(10, 5))
    plt.plot(
        [float(row["time_s"]) for row in disturbed],
        [float(row["feedwater_flow_pu"]) for row in disturbed],
        label="Feedwater flow"
    )
    plt.plot(
        [float(row["time_s"]) for row in disturbed],
        [float(row["steam_flow_pu"]) for row in disturbed],
        label="Steam flow"
    )
    plt.axvline(10, linestyle="--", label="Demand step at 10 s")
    plt.xlabel("Time (s)")
    plt.ylabel("Flow (pu)")
    plt.title("Feedwater and Steam Flow")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS / "disturbed_flows.png", dpi=160)
    plt.close()

    print("Stage 1 plots generated:")
    print(PLOTS)


if __name__ == "__main__":
    main()
