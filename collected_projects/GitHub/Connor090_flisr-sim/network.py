"""Build a small two-feeder distribution network in pandapower.

Feeder A: Substation A -> breaker -> Section 1 -> SW_A1 -> Section 2 -> SW_A2
          -> Section 3a -> SW_A3 -> Section 3b -> (normally open TIE) -> end of Feeder B
Feeder B: Substation B -> breaker -> Section 1 -> SW_B1 -> Section 2 -> TIE
"""
import pandapower as pp

VOLTAGE_KV = 13.8      # a common US distribution voltage
LINE_R = 0.20          # ohms per km
LINE_X = 0.40          # ohms per km
LINE_C = 10.0          # nanofarads per km
LINE_MAX_KA = 0.40     # 400 A thermal rating


def add_line(net, from_bus, to_bus, km, name):
    """One overhead line segment with our standard conductor."""
    return pp.create_line_from_parameters(
        net, from_bus, to_bus, length_km=km,
        r_ohm_per_km=LINE_R, x_ohm_per_km=LINE_X,
        c_nf_per_km=LINE_C, max_i_ka=LINE_MAX_KA, name=name)


def add_load(net, bus, mw, customers, name):
    """A lumped load: everything served from this point, 0.95 power factor."""
    mvar = mw * 0.33  # tan(acos(0.95)) is about 0.33
    idx = pp.create_load(net, bus, p_mw=mw, q_mvar=mvar, name=name)
    net.load.at[idx, "customers"] = customers
    return idx


def build_network(feeder_b_load_scale=1.0):
    net = pp.create_empty_network(name="Two feeders with a tie")

    # ---- Buses (every node where something connects) ----
    def bus(name):
        return pp.create_bus(net, vn_kv=VOLTAGE_KV, name=name)

    a_sub, a1, a2, a3, a4, a5, a6, a7, a8 = [bus(n) for n in
        ["A_sub", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]]
    b_sub, b1, b2, b3, b4 = [bus(n) for n in ["B_sub", "B1", "B2", "B3", "B4"]]

    # ---- Sources: each substation is a stiff grid connection ----
    pp.create_ext_grid(net, a_sub, vm_pu=1.03, name="Substation A")
    pp.create_ext_grid(net, b_sub, vm_pu=1.03, name="Substation B")

    # ---- Feeder A ----
    pp.create_switch(net, a_sub, a1, et="b", closed=True, type="CB", name="CB_A")
    add_line(net, a1, a2, 2.0, "A sec1")
    pp.create_switch(net, a2, a3, et="b", closed=True, type="LBS", name="SW_A1")
    add_line(net, a3, a4, 2.0, "A sec2")
    pp.create_switch(net, a4, a5, et="b", closed=True, type="LBS", name="SW_A2")
    add_line(net, a5, a6, 1.5, "A sec3a")
    pp.create_switch(net, a6, a7, et="b", closed=True, type="LBS", name="SW_A3")
    add_line(net, a7, a8, 1.5, "A sec3b")

    add_load(net, a2, 2.0, 600, "A sec1 load")
    add_load(net, a4, 1.5, 450, "A sec2 load")
    add_load(net, a6, 1.5, 450, "A sec3a load")
    add_load(net, a8, 1.0, 300, "A sec3b load")

    # ---- Feeder B ----
    pp.create_switch(net, b_sub, b1, et="b", closed=True, type="CB", name="CB_B")
    add_line(net, b1, b2, 2.5, "B sec1")
    pp.create_switch(net, b2, b3, et="b", closed=True, type="LBS", name="SW_B1")
    add_line(net, b3, b4, 2.5, "B sec2")

    add_load(net, b2, 2.0 * feeder_b_load_scale, 600, "B sec1 load")
    add_load(net, b4, 2.0 * feeder_b_load_scale, 600, "B sec2 load")

    # ---- The normally open tie between the two feeder ends ----
    pp.create_switch(net, a8, b4, et="b", closed=False, type="LBS", name="TIE_AB")

    net.load["customers"] = net.load["customers"].astype(int)
    return net
