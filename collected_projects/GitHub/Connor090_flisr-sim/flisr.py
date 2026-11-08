"""A toy FLISR (Fault Location, Isolation, and Service Restoration) engine."""
import networkx as nx
import pandapower as pp
import pandapower.topology as top

V_MIN, V_MAX = 0.95, 1.05   # allowed voltage band, per unit
MAX_LOADING = 100.0         # allowed line loading, percent of rating


# ---------- Helpers: what's energized, who's out, are we within limits ----------

def dead_buses(net):
    """Buses with no path back to any substation."""
    return set(top.unsupplied_buses(net))


def customers_out(net):
    dead = dead_buses(net)
    return int(net.load.loc[net.load.bus.isin(dead), "customers"].sum())


def check_limits(net):
    """Run a power flow and return a list of violations (empty list = OK)."""
    pp.runpp(net, numba=False)
    problems = []
    for idx, row in net.res_line.iterrows():
        if row.loading_percent > MAX_LOADING:
            problems.append(f"line '{net.line.at[idx, 'name']}' at {row.loading_percent:.0f}%")
    live = net.res_bus.dropna(subset=["vm_pu"])
    for idx, row in live.iterrows():
        if not V_MIN <= row.vm_pu <= V_MAX:
            problems.append(f"bus {net.bus.at[idx, 'name']} at {row.vm_pu:.3f} pu")
    return problems


def switch_name(net, sw):
    return net.switch.at[sw, "name"]


def report(net, label, history=None):
    out = customers_out(net)
    if history is not None:
        history.append((label.split(":")[0], out))
    total = int(net.load.customers.sum())
    print(f"\n=== {label} ===")
    print(f"Customers out: {out} of {total}")
    opened = [switch_name(net, s) for s in net.switch.index if not net.switch.at[s, "closed"]]
    print(f"Open switches: {', '.join(opened)}")


# ---------- Step 1: trip ----------

def find_protecting_breaker(net, line):
    """The breaker whose opening de-energizes the faulted line."""
    line_bus = net.line.at[line, "from_bus"]
    for sw in net.switch.index[net.switch.type == "CB"]:
        if not net.switch.at[sw, "closed"]:
            continue
        net.switch.at[sw, "closed"] = False
        cuts_it = line_bus in dead_buses(net)
        net.switch.at[sw, "closed"] = True
        if cuts_it:
            return sw
    raise ValueError("No breaker protects this line")


def trip(net, line):
    cb = find_protecting_breaker(net, line)
    net.switch.at[cb, "closed"] = False
    return cb


# ---------- Steps 2-3: locate and isolate ----------

def faulted_zone(net, line):
    """Buses between the switches that surround the faulted line.

    Build a graph with EVERY switch treated as open. The piece that holds the
    faulted line is the smallest section switches can cut out.
    """
    g = top.create_nxgraph(net, respect_switches=False, include_switches=False)
    start = net.line.at[line, "from_bus"]
    return set(nx.node_connected_component(g, start))


def isolate(net, line):
    zone = faulted_zone(net, line)
    boundary = []
    for sw in net.switch.index:
        ends = {net.switch.at[sw, "bus"], net.switch.at[sw, "element"]}
        if len(ends & zone) == 1:          # one end inside the zone, one outside
            net.switch.at[sw, "closed"] = False
            boundary.append(sw)
    return zone, boundary


# ---------- Step 4: restore upstream ----------

def restore_upstream(net, cb, boundary):
    """Reclose the breaker unless it is itself one of the isolation switches."""
    if cb in boundary:
        return False
    net.switch.at[cb, "closed"] = True
    return True


# ---------- Steps 5-6: restore downstream through a tie, within limits ----------

def candidate_ties(net, normally_open, isolated):
    """Normally open switches with one side dead and the other side live."""
    dead = dead_buses(net)
    found = []
    for sw in normally_open:
        if sw in isolated:
            continue
        a, b = net.switch.at[sw, "bus"], net.switch.at[sw, "element"]
        if (a in dead) != (b in dead):
            found.append(sw)
    return found


def restore_downstream(net, normally_open, isolated, verbose=True):
    for tie in candidate_ties(net, normally_open, isolated):
        dead_before = dead_buses(net)
        net.switch.at[tie, "closed"] = True
        problems = check_limits(net)
        if not problems:
            if verbose:
                print(f"Closed {switch_name(net, tie)}: all limits OK")
            continue
        if verbose:
            print(f"Closing {switch_name(net, tie)} violates: {'; '.join(problems)}")

        # Partial restoration: shed the piece nearest the fault first.
        picked_up = dead_before - dead_buses(net)
        g = top.create_nxgraph(net)
        tie_bus = next(b for b in (net.switch.at[tie, "bus"], net.switch.at[tie, "element"])
                       if b in picked_up)
        dist = nx.single_source_shortest_path_length(g, tie_bus)
        inside = [sw for sw in net.switch.index
                  if net.switch.at[sw, "closed"] and sw != tie
                  and net.switch.at[sw, "bus"] in picked_up
                  and net.switch.at[sw, "element"] in picked_up]
        inside.sort(key=lambda sw: dist.get(net.switch.at[sw, "bus"], 0), reverse=True)

        for sw in inside:
            net.switch.at[sw, "closed"] = False
            problems = check_limits(net)
            if not problems:
                if verbose:
                    print(f"Opened {switch_name(net, sw)} to shed load: limits OK")
                break
            net.switch.at[sw, "closed"] = True
        else:
            net.switch.at[tie, "closed"] = False
            if verbose:
                print(f"No safe partial restoration; reopened {switch_name(net, tie)}")


# ---------- The whole sequence ----------

def run_flisr(net, faulted_line):
    history = [("0. Before fault", customers_out(net))]
    normally_open = [s for s in net.switch.index if not net.switch.at[s, "closed"]]
    print(f"Fault on line '{net.line.at[faulted_line, 'name']}'")

    cb = trip(net, faulted_line)
    report(net, f"1. Trip: {switch_name(net, cb)} opened", history)

    zone, boundary = isolate(net, faulted_line)
    names = ", ".join(switch_name(net, s) for s in boundary)
    report(net, f"2-3. Locate and isolate: opened {names}", history)

    if restore_upstream(net, cb, boundary):
        report(net, f"4. Restore upstream: {switch_name(net, cb)} reclosed", history)

    restore_downstream(net, normally_open, set(boundary))
    report(net, "5-6. Restore downstream", history)
    problems = check_limits(net)
    print("Final limits:", "OK" if not problems else problems)
    return history
