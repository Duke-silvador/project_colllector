import csv
import io
from typing import Dict, List

import altair as alt
import pandas as pd
import streamlit as st

from cache_engine import Cache, MAPPING_CODES
from trace_parser import parse_trace


st.set_page_config(page_title="CPU Cache Simulator", page_icon="🧠", layout="wide")
st.markdown("""
<style>
.stApp { background: linear-gradient(145deg, #f6f8ff 0%, #fffdf8 52%, #f3fbfa 100%); }
[data-testid="stHeader"] { background: transparent; }
[data-testid="stSidebar"] { background: linear-gradient(180deg, #f0f3ff 0%, #f4f8fb 100%); border-right: 1px solid #e4e8f3; }
[data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 { color: #293653; }
div.block-container { max-width: 1500px; padding-top: 2.1rem; padding-bottom: 3rem; }
.hero-card { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
  padding: 2rem 2.2rem; margin: 0.1rem 0 1.5rem; border: 1px solid #e4e8f3; border-radius: 28px;
  background: linear-gradient(115deg, rgba(255,255,255,.95), rgba(244,248,255,.88));
  box-shadow: 0 16px 46px rgba(66, 83, 130, .08); overflow: hidden; }
.hero-copy { max-width: 650px; position: relative; z-index: 1; }
.hero-kicker { color: #6f78b7; text-transform: uppercase; letter-spacing: .15em; font-size: .72rem; font-weight: 800; margin-bottom: .8rem; }
.hero-title { color: #25334f; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 780; letter-spacing: -.045em; line-height: 1.08; margin: 0 0 .8rem; }
.hero-subtitle { color: #68748c; font-size: 1.02rem; line-height: 1.65; margin: 0; max-width: 570px; }
.hero-art { flex: 0 0 390px; max-width: 42%; }
.hero-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: .36rem .7rem; margin-top: 1.1rem;
  color: #4d8d87; background: #e6f6f2; font-size: .72rem; font-weight: 700; }
h2, h3, h4 { color: #293653; letter-spacing: -.02em; }
[data-testid="stMetric"] { background: rgba(255,255,255,.87); border: 1px solid #e8eaf2; border-radius: 18px;
  padding: 1rem 1.1rem; box-shadow: 0 8px 24px rgba(66,83,130,.055); }
[data-testid="stMetricLabel"] { color: #78839b; }
[data-testid="stMetricValue"] { color: #2e3d5b; }
[data-testid="stWidgetLabel"] { color: #68748c; }
textarea, input { background-color: #fff !important; color: #293653 !important; border-radius: 12px !important; }
div.stButton > button { border: 0; border-radius: 13px; color: white; font-weight: 750;
  background: linear-gradient(100deg, #7786da, #9a87d9); box-shadow: 0 8px 18px rgba(126,128,213,.22); }
div.stButton > button:hover { color: white; border: 0; background: linear-gradient(100deg, #697bd2, #8c79d0); }
[data-testid="stDataFrame"] { border: 1px solid #e8eaf2; border-radius: 15px; overflow: hidden; }
[data-testid="stExpander"] { background: rgba(255,255,255,.68); border: 1px solid #e7eaf2; border-radius: 15px; }
div[data-testid="stAlert"] { border-radius: 14px; }
@media (max-width: 760px) { .hero-art { display: none; } .hero-card { padding: 1.5rem; } }
</style>
<section class="hero-card">
  <div class="hero-copy">
    <div class="hero-kicker">Interactive systems playground</div>
    <div class="hero-title">A little closer to<br>the machine.</div>
    <p class="hero-subtitle">Trace memory through a cache hierarchy. Tune the policies, watch blocks find their place, and see what each access costs.</p>
    <span class="hero-chip">✦ &nbsp; C++ engine · live cache maps · cycle estimates</span>
  </div>
  <div class="hero-art">
    <svg viewBox="0 0 420 230" role="img" aria-label="Memory blocks flowing through cache levels">
      <defs>
        <linearGradient id="cacheGlow" x1="0" x2="1"><stop offset="0" stop-color="#c9d3ff"/><stop offset="1" stop-color="#e6d6ff"/></linearGradient>
        <linearGradient id="memoryGlow" x1="0" x2="1"><stop offset="0" stop-color="#c8eee3"/><stop offset="1" stop-color="#e0f6ee"/></linearGradient>
      </defs>
      <circle cx="212" cy="112" r="102" fill="#f0f2ff" opacity=".85"/>
      <circle cx="342" cy="49" r="20" fill="#fff0d9"/>
      <circle cx="83" cy="177" r="12" fill="#f7dce7"/>
      <path d="M84 114 H338" stroke="#c7cce0" stroke-width="3" stroke-dasharray="5 8"/>
      <g transform="translate(16,76)">
        <rect width="82" height="76" rx="20" fill="#fff" stroke="#e4e8f2" stroke-width="2"/>
        <circle cx="41" cy="25" r="11" fill="#ffe4bc"/><path d="M27 54h28" stroke="#c8cfdf" stroke-width="4" stroke-linecap="round"/>
        <text x="41" y="69" text-anchor="middle" font-size="11" fill="#596680" font-family="sans-serif">CPU</text>
      </g>
      <g transform="translate(126,62)">
        <rect width="74" height="102" rx="19" fill="url(#cacheGlow)" stroke="#d6dafa" stroke-width="2"/>
        <rect x="14" y="18" width="46" height="12" rx="6" fill="#fff" opacity=".9"/><rect x="14" y="39" width="46" height="12" rx="6" fill="#fff" opacity=".75"/><rect x="14" y="60" width="46" height="12" rx="6" fill="#fff" opacity=".6"/>
        <text x="37" y="91" text-anchor="middle" font-size="12" font-weight="700" fill="#59639b" font-family="sans-serif">L1</text>
      </g>
      <g transform="translate(227,76)">
        <rect width="70" height="76" rx="19" fill="#eee8ff" stroke="#e2daf8" stroke-width="2"/>
        <rect x="14" y="17" width="42" height="10" rx="5" fill="#fff"/><rect x="14" y="34" width="42" height="10" rx="5" fill="#fff" opacity=".78"/>
        <text x="35" y="64" text-anchor="middle" font-size="12" font-weight="700" fill="#796eaa" font-family="sans-serif">L2</text>
      </g>
      <g transform="translate(326,76)">
        <rect width="78" height="76" rx="19" fill="url(#memoryGlow)" stroke="#d4eee4" stroke-width="2"/>
        <path d="M19 23h40M19 34h40M19 45h40" stroke="#8bbcaf" stroke-width="4" stroke-linecap="round"/>
        <text x="39" y="65" text-anchor="middle" font-size="10" font-weight="700" fill="#558f81" font-family="sans-serif">MEMORY</text>
      </g>
      <circle cx="109" cy="114" r="4" fill="#98a3dc"/><circle cx="211" cy="114" r="4" fill="#b3a0dc"/><circle cx="309" cy="114" r="4" fill="#8bc7b4"/>
      <path d="M98 108l9 6-9 6M200 108l9 6-9 6M300 108l9 6-9 6" fill="none" stroke="#a3abc9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
</section>
""", unsafe_allow_html=True)


def divisors(number: int) -> List[int]:
    return [value for value in range(1, min(number, 64) + 1) if number % value == 0]


with st.sidebar:
    st.header("Cache configuration")
    level_count = st.selectbox("Number of cache levels", [1, 2, 3], index=0)
    block_size = st.number_input("Block size (bytes, shared by all levels)", min_value=1, value=16, step=1)
    memory_latency = st.number_input("Memory latency (cycles)", min_value=1, value=100, step=10)
    configurations: List[Dict[str, object]] = []

    for level_index in range(level_count):
        level_name = f"L{level_index + 1}"
        default_capacity = [256, 2048, 16384][level_index]
        with st.expander(f"{level_name} settings", expanded=(level_index == 0)):
            capacity = st.number_input(
                f"{level_name} capacity (bytes)", min_value=1, value=default_capacity,
                step=max(int(block_size), 1), key=f"capacity_{level_name}",
            )
            mapping = st.selectbox(
                f"{level_name} mapping", list(MAPPING_CODES), key=f"mapping_{level_name}"
            )
            lines = max(int(capacity) // max(int(block_size), 1), 1)
            ways = 1
            if mapping == "Set associative":
                way_options = divisors(lines)
                default_ways = 4 if 4 in way_options else way_options[-1]
                ways = st.selectbox(
                    f"{level_name} ways", way_options,
                    index=way_options.index(default_ways), key=f"ways_{level_name}",
                )
            replacement = st.selectbox(
                f"{level_name} replacement", ["LRU", "FIFO", "Random"], key=f"replacement_{level_name}"
            )
            access_latency = st.number_input(
                f"{level_name} access latency (cycles)", min_value=1,
                value=[1, 10, 25][level_index], step=1, key=f"latency_{level_name}",
            )
            write_policy = st.selectbox(
                f"{level_name} write policy", ["Write-back", "Write-through"], key=f"write_policy_{level_name}"
            )
            write_allocate = st.selectbox(
                f"{level_name} allocation on write miss",
                ["Write-allocate", "No-write-allocate"], key=f"allocation_{level_name}",
            )
            configurations.append({
                "capacity_bytes": int(capacity), "block_size_bytes": int(block_size),
                "mapping": mapping, "associativity": int(ways),
                "replacement": replacement, "write_policy": write_policy,
                "write_allocate": write_allocate,
                "access_latency_cycles": int(access_latency),
            })

st.subheader("Memory access trace")
st.caption("Use one address per line for reads, or prefix an address with R or W. Decimal and 0x hexadecimal addresses are supported; # starts a comment.")
sample_trace = "R 0x0\nR 0x10\nW 0x20\nR 0x0\nW 0x100\nR 0x10"
trace_text = st.text_area("Trace", value=sample_trace, height=180, label_visibility="collapsed")
uploaded_trace = st.file_uploader("Or load a trace file", type=["txt", "trace", "csv"])
source_text = uploaded_trace.getvalue().decode("utf-8", errors="replace") if uploaded_trace else trace_text

with st.expander("How the simulator models accesses"):
    st.markdown(
        "- Each access starts at L1 and checks lower levels on a miss.\n"
        "- A read miss fetches a block from the next level or memory.\n"
        "- Write-back keeps modified blocks dirty until eviction; write-through propagates writes immediately.\n"
        "- Write-allocate fetches a block after a write miss; no-write-allocate bypasses that cache level.\n"
        "- Each level uses the configured LRU, FIFO, or deterministic random replacement policy.\n"
        "- Access time adds each visited cache's configured latency and each resulting memory transaction's latency.\n"
        "- Levels share one block size. The hierarchy is non-inclusive: evicting a block from one level does not invalidate copies in another."
    )

def run_simulation(trace: str, configs: List[Dict[str, object]], memory_latency_cycles: int) -> None:
    operations = parse_trace(trace)
    for index, config in enumerate(configs, start=1):
        capacity = int(config["capacity_bytes"])
        if capacity < int(block_size) or capacity % int(block_size):
            raise ValueError(f"L{index}: capacity must be a multiple of block size and hold at least one block.")
        line_count = capacity // int(block_size)
        if line_count > 1000000:
            raise ValueError(f"L{index}: cache levels are limited to one million lines.")
        if config["mapping"] == "Set associative" and line_count % int(config["associativity"]):
            raise ValueError(f"L{index}: number of ways must divide the number of cache lines.")

    simulator = Cache(configs, memory_latency_cycles)
    rows = simulator.run(operations)
    statistics = simulator.statistics
    cache_contents = simulator.contents()
    simulator.close()
    st.session_state["results"] = rows
    st.session_state["statistics"] = statistics
    st.session_state["cache_contents"] = cache_contents
    st.session_state["configuration"] = configs
    st.session_state["trace"] = trace
    st.session_state["memory_latency_cycles"] = memory_latency_cycles


run_clicked = st.button("Run simulation", type="primary")
if run_clicked or "results" not in st.session_state:
    try:
        run_simulation(source_text, configurations, int(memory_latency))
    except (ValueError, RuntimeError) as error:
        st.error(str(error))

if "results" in st.session_state:
    settings_changed = (
        st.session_state["configuration"] != configurations
        or st.session_state["trace"] != source_text
        or st.session_state["memory_latency_cycles"] != int(memory_latency)
    )
    if settings_changed:
        st.info("Your trace or settings changed. Run the simulation to refresh these results.")
    stats = st.session_state["statistics"]
    level_stats = stats["levels"]
    first_level = level_stats[0]
    total_accesses = first_level["accesses"]
    hit_rate = first_level["hits"] / total_accesses if total_accesses else 0.0

    st.subheader("Simulation results")
    top_metrics = st.columns(4)
    top_metrics[0].metric("CPU accesses", total_accesses)
    top_metrics[1].metric("L1 hit rate", f"{hit_rate:.1%}")
    top_metrics[2].metric("Average access time", f"{stats['average_access_time_cycles']:.1f} cycles")
    top_metrics[3].metric("Memory traffic", f"{stats['memory']['reads']} reads / {stats['memory']['writes']} writes")

    summary_rows = []
    for index, level in enumerate(level_stats, start=1):
        accesses = level["accesses"]
        summary_rows.append({
            "Level": f"L{index}", "Transactions": accesses,
            "Hit latency": f"{st.session_state['configuration'][index - 1]['access_latency_cycles']} cycles",
            "Hits": level["hits"], "Misses": level["misses"],
            "Hit rate": f"{level['hits'] / accesses:.1%}" if accesses else "—",
            "Miss rate": f"{level['misses'] / accesses:.1%}" if accesses else "—",
            "Evictions": level["evictions"], "Writebacks": level["writebacks"],
            "Bypasses": level["bypasses"],
        })
    st.markdown("#### Per-level statistics")
    st.dataframe(summary_rows, width="stretch", hide_index=True)

    result_rows = st.session_state["results"]
    st.markdown("#### What the trace looks like")
    rates = []
    for row in summary_rows:
        level_index = int(row["Level"][1:]) - 1
        level = level_stats[level_index]
        accesses = level["accesses"]
        rates.extend([
            {"Level": row["Level"], "Outcome": "Hits", "Rate": 100 * level["hits"] / accesses if accesses else 0},
            {"Level": row["Level"], "Outcome": "Misses", "Rate": 100 * level["misses"] / accesses if accesses else 0},
        ])
    rates_chart = alt.Chart(pd.DataFrame(rates)).mark_bar(size=26, cornerRadius=7).encode(
        x=alt.X("Level:N", title=None, axis=alt.Axis(labelAngle=0)),
        xOffset=alt.XOffset("Outcome:N"),
        y=alt.Y("Rate:Q", title="Share of accesses (%)", scale=alt.Scale(domain=[0, 100]),
                axis=alt.Axis(grid=True, tickCount=5)),
        color=alt.Color("Outcome:N", title=None,
                        scale=alt.Scale(domain=["Hits", "Misses"], range=["#50b8a7", "#ef9b98"])),
        tooltip=["Level", "Outcome", alt.Tooltip("Rate:Q", format=".1f")],
    ).properties(height=220).configure_view(stroke=None).configure_axis(
        labelColor="#78839b", titleColor="#78839b", gridColor="#e9edf5"
    ).configure_legend(labelColor="#68748c", orient="top")
    st.altair_chart(rates_chart, use_container_width=True)

    chart_left, chart_right = st.columns(2)
    with chart_left:
        st.markdown("#### Cost of each access")
        timeline_data = [{
            "Access": row["#"], "Cycles": row["Cycles"], "L1 result": row["L1"],
            "Operation": row["Operation"], "Address": row["Address"],
        } for row in result_rows]
        timeline = alt.Chart(pd.DataFrame(timeline_data)).mark_line(point=True, strokeWidth=2.5).encode(
            x=alt.X("Access:Q", title="Access number", axis=alt.Axis(tickMinStep=1)),
            y=alt.Y("Cycles:Q", title="Estimated cycles", axis=alt.Axis(grid=True)),
            color=alt.Color("L1 result:N", title="L1 outcome",
                            scale=alt.Scale(domain=["HIT", "MISS", "EVICTION", "BYPASS"],
                                            range=["#50b8a7", "#8f9be0", "#ef9b98", "#e6b66b"])),
            tooltip=["Access", "Operation", "Address", "L1 result", "Cycles"],
        ).properties(height=245).configure_view(stroke=None).configure_axis(
            labelColor="#78839b", titleColor="#78839b", gridColor="#e9edf5"
        )
        st.altair_chart(timeline, use_container_width=True)

    with chart_right:
        st.markdown("#### Where blocks land in L1")
        observed_sets = sorted({int(row["L1 set"]) for row in result_rows})
        map_data = [{
            "Block": row["Block"], "Set index": int(row["L1 set"]),
            "Outcome": row["L1"], "Operation": row["Operation"],
            "Address": row["Address"], "Access": row["#"],
        } for row in result_rows]
        mapping_chart = alt.Chart(pd.DataFrame(map_data)).mark_circle(size=115, opacity=.78).encode(
            x=alt.X("Block:Q", title="Memory block number"),
            y=alt.Y("Set index:Q", title="L1 cache set", scale=alt.Scale(reverse=True),
                    axis=alt.Axis(values=observed_sets, grid=True)),
            color=alt.Color("Outcome:N", title="L1 outcome",
                            scale=alt.Scale(domain=["HIT", "MISS", "EVICTION", "BYPASS"],
                                            range=["#50b8a7", "#8f9be0", "#ef9b98", "#e6b66b"])),
            shape=alt.Shape("Operation:N", title="Operation"),
            tooltip=["Access", "Operation", "Address", "Block", "Set index", "Outcome"],
        ).properties(height=245).configure_view(stroke=None).configure_axis(
            labelColor="#78839b", titleColor="#78839b", gridColor="#e9edf5"
        )
        st.altair_chart(mapping_chart, use_container_width=True)

    st.markdown("#### Access-by-access results")
    st.dataframe(st.session_state["results"], width="stretch", hide_index=True)
    csv_buffer = io.StringIO()
    csv_writer = csv.DictWriter(csv_buffer, fieldnames=list(result_rows[0].keys()))
    csv_writer.writeheader()
    csv_writer.writerows(result_rows)
    st.download_button(
        "Download access results as CSV", data=csv_buffer.getvalue(),
        file_name="cache_simulation_results.csv", mime="text/csv",
    )
    with st.expander("Final resident cache blocks"):
        st.caption("Only valid lines are listed. Dirty lines have not yet been written back to memory.")
        for level in st.session_state["cache_contents"]:
            st.markdown(f"**L{level['level']}**")
            if level["truncated"]:
                st.caption(f"Showing the first 5,000 of {level['total']:,} resident blocks.")
            if level["lines"]:
                st.dataframe(level["lines"], width="stretch", hide_index=True)
            else:
                st.caption("No valid cache lines.")
    st.caption("Lower-level transaction counts include block fills, propagated writes, and dirty writebacks.")
