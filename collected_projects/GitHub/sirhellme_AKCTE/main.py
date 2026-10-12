import os 
import glob
import numpy as np
import matplotlib.pyplot as plt

from src.io import combined_quarter, clean_outliers, calculate_cadence
from src.transit import find_period, phase_fold

DATA = "../Exoplanet-Analysis/data/raw/Kepler553/"
OUTPUT = "../Exoplanet-Analysis/data/output"

TARGET = "Kepler-553 c"
KIC = "KIC 10937029"

TARGET_PERIOD = 328.24

# Published Value
PUBLISHED_PERIOD = 328.24017
PUBLISHED_PERIOD_ERR_PLUS = 0.00039
PUBLISHED_PERIOD_ERR_MINUS = 0.00040

PUBLISHED_EPOCH = 199.203375
PUBLISHED_EPOCH_ERR = 0.000858

# Gajdos et al. (2019)
PUBLISHED_DURATION_HOURS = 12.2726
PUBLISHED_DURATION_ERR_HOURS = 0.0671

PUBLISHED_DURATION = PUBLISHED_DURATION_HOURS / 24
PUBLISHED_DURATION_ERR = PUBLISHED_DURATION_ERR_HOURS / 24

# 2908.3 ppm = 0.29083 %
PUBLISHED_DEPTH_PPM = 2908.3
PUBLISHED_DEPTH_ERR_PPM = 14.8

PUBLISHED_DEPTH = PUBLISHED_DEPTH_PPM / 10000
PUBLISHED_DEPTH_ERR = PUBLISHED_DEPTH_ERR_PPM / 10000

def calculate_difference(analysis_value, published_value):
    return abs(analysis_value - published_value) / abs(published_value) * 100

def comparison(result, output_path):

    period = result['period']
    epoch = result['t0']
    duration = result['duration']
    depth = result['depth'] * 100

    rows = [
        {
            "Parameter": "Orbital Period (days)",
            "Analysis Value": period,
            "Analysis Uncertainty": np.nan,
            "Published Value": PUBLISHED_PERIOD,
            "Published Uncertainty": f"+{PUBLISHED_PERIOD_ERR_PLUS}/-{PUBLISHED_PERIOD_ERR_MINUS}",
            "Difference (%)": calculate_difference(
                period,
                PUBLISHED_PERIOD
            )
        },

        {
            "Parameter": "Transit Epoch (BKJD)",
            "Analysis Value": epoch,
            "Analysis Uncertainty": np.nan,
            "Published Value": PUBLISHED_EPOCH,
            "Published Uncertainty": PUBLISHED_EPOCH_ERR,
            "Difference (%)": calculate_difference(
                epoch,
                PUBLISHED_EPOCH
            )
        },

        {
            "Parameter": "Transit Duration (days)",
            "Analysis Value": duration,
            "Analysis Uncertainty": np.nan,
            "Published Value": PUBLISHED_DURATION,
            "Published Uncertainty": PUBLISHED_DURATION_ERR,
            "Difference (%)": calculate_difference(
                duration,
                PUBLISHED_DURATION
            )
        },

        {
            "Parameter": "Transit Depth (%)",
            "Analysis Value": depth,
            "Analysis Uncertainty": result["depth_err"] * 100,
            "Published Value": PUBLISHED_DEPTH,
            "Published Uncertainty": PUBLISHED_DEPTH_ERR,
            "Difference (%)": calculate_difference(
                depth,
                PUBLISHED_DEPTH
            )
        }
    ]

    with open(output_path, "w") as f:

        f.write(
            "Parameter,Analysis Value,Analysis Uncertainty,"
            "Published Value,Published Uncertainty,Difference (%)\n"
        )

        for row in rows:

            f.write(
                f"{row['Parameter']},"
                f"{row['Analysis Value']:.8f},"
                f"{row['Analysis Uncertainty']},"
                f"{row['Published Value']:.8f},"
                f"{row['Published Uncertainty']},"
                f"{row['Difference (%)']:.6f}\n"
            )

def main():
    os.makedirs(OUTPUT, exist_ok=True)

    fits_files = glob.glob(os.path.join(DATA, "*.fits"))

    if len(fits_files) == 0:
        raise FileNotFoundError(
            f"No .fits file found in {DATA}"
        )
    else:
        print(f"Found {len(fits_files)} fits file, starting to combined...")
        time, flux = combined_quarter(DATA)
        clean_time, clean_flux = clean_outliers(time, flux)
        cadence_days = calculate_cadence(time)
        cadence_minutes = cadence_days * 24 * 60

    print(f"Target: {TARGET}")
    print(f"HOST: {KIC}")
    print(f"Expected Period: {TARGET_PERIOD} days")

    print(f"Numbers of points after cleaning: {len(clean_time)}")
    print(f"Cadencec: {cadence_days:.7f} days")
    print(f"Cadence: {cadence_minutes:.2f} minutes")

    print("Finding the BLS...")
    result = find_period(clean_time, clean_flux)

    print(f"Best Period: {result['period']} days")
    print(f"Transit Time: {result['t0']}")
    print(f"Transit Durations: {result['duration']} days")
    print(
        f"Depth of Transit: " 
        f"{result['depth']*100} ±"
        f"{result['depth_err']*100} %"
          )
    print(f"BLS Power: {result['power']}")

    phase, folded_flux = phase_fold(
        clean_time,
        clean_flux,
        result['period'],
        result['t0'])

    # save the summary
    with open(os.path.join(OUTPUT, "result of analysis.txt"), "w") as f:
        f.write(f"Number of Data Points: {len(clean_time)}\n")
        f.write(f"Cadencec: {cadence_days:.7f} days\n")
        f.write(f"Cadence: {cadence_minutes:.2f} minutes\n")
        f.write(f"Best Period: {result['period']:.6f} days\n")
        f.write(f"Epoch   : {result['t0']:.6f}\n")
        f.write(f"Transit Duration    : {result['duration']:.6f} days\n")
        f.write(f"Depth of transit : {result['depth']*100:.6f} %\n")
        f.write(f"Power BLS         : {result['power']:.4f}\n")
        comparison_path = os.path.join(OUTPUT, "comparison parameter.csv")
        comparison(result, comparison_path)

        print(f"Comparison saved in {comparison_path}")

    fig, ax = plt.subplots(2, 2, figsize=(12, 8))

    ax[0, 0].plot(time, flux, ".", ms=2, color="gray")
    ax[0, 0].set_title("Raw Light Curve")
    ax[0, 0].set_xlabel("Time (days)")
    ax[0, 0].set_ylabel("Flux")

    ax[0, 1].plot(clean_time, clean_flux, ".", ms=2, color="steelblue")
    ax[0, 1].set_title("After Cleaned & Normalized")
    ax[0, 1].set_xlabel("Time (days)")
    ax[0, 1].set_ylabel("Flux relative")

    ax[1, 0].plot(result["period_grid"], result["power_grid"], color="darkorange")
    ax[1, 0].axvline(result["period"], color="red", linestyle="--", linewidth=1)
    ax[1, 0].set_title("Periodogram BLS")
    ax[1, 0].set_xlabel("Period (days)")
    ax[1, 0].set_ylabel("Power")

    ax[1, 1].plot(phase, folded_flux, ".", ms=3, color="black")
    ax[1, 1].set_title(f"Folded Curve (P = {result['period']:.3f} days)")
    ax[1, 1].set_xlabel("Phase")
    ax[1, 1].set_ylabel("Flux relative")
    ax[1, 1].set_xlim(-0.5, 0.5)

    fig.tight_layout()
    path_gambar = os.path.join(OUTPUT, "light curve analysis.png")
    fig.savefig(path_gambar, dpi=200)
    plt.close(fig)

    print(f"\nThe Image saved in {path_gambar}")
    print(f"The Summary saved in {os.path.join(OUTPUT, 'result of analysis.txt')}")


if __name__ == "__main__":
    main()
