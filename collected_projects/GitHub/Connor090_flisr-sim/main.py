import pandapower as pp
from network import build_network
from flisr import run_flisr

# ---- Step 3: base case ----
net = build_network()
pp.runpp(net, numba=False)
print(net.res_bus[["vm_pu"]].join(net.bus["name"]).round(3).to_string())
print(net.res_line[["loading_percent"]].join(net.line["name"]).round(1).to_string())

# ---- Step 6: fault on Feeder A, Section 2 ----
print("\n" + "#" * 60)
net = build_network()
fault = net.line.index[net.line.name == "A sec2"][0]
run_flisr(net, fault)

# ---- Step 7: same fault, Feeder B heavily loaded ----
print("\n" + "#" * 60)
net = build_network(feeder_b_load_scale=1.8)
fault = net.line.index[net.line.name == "A sec2"][0]
run_flisr(net, fault)
