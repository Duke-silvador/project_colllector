import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from network import build_network
from flisr import run_flisr

scenarios = [(1.0, "Normal Feeder B load"), (1.8, "Heavy Feeder B load")]
results = []
for scale, label in scenarios:
    net = build_network(feeder_b_load_scale=scale)
    fault = net.line.index[net.line.name == "A sec2"][0]
    results.append((label, run_flisr(net, fault)))

stages = [h[0] for h in results[0][1]]
x = np.arange(len(stages))
width = 0.38
fig, ax = plt.subplots(figsize=(9, 4.5))
for i, (label, history) in enumerate(results):
    out = [h[1] for h in history]
    bars = ax.bar(x + (i - 0.5) * width, out, width, label=label)
    ax.bar_label(bars, fontsize=8)

ax.set_xticks(x)
ax.set_xticklabels([s.split(". ", 1)[1] for s in stages])
ax.set_ylabel("Customers out")
ax.set_title("Fault on Feeder A, Section 2: customers out at each FLISR stage")
ax.legend()
fig.tight_layout()
fig.savefig("flisr_stages.png", dpi=150)
print("Saved flisr_stages.png")
