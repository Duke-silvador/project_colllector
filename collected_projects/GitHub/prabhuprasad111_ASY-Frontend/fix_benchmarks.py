import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix Executive Benchmarks
exec_bench_old = r'<div className="benchmark-metrics">.*?<div className="benchmark-metric-label">NTFP Revenue</div><div className="benchmark-metric-val">[^<]+</div></div>.*?<div className="benchmark-metric-label">Fund Util</div><div className="benchmark-metric-val">\{calcExecUtil\}%</div></div>\s*</div>'

exec_bench_new = """<div className="benchmark-metrics">
              <div className="benchmark-metric"><div className="benchmark-metric-label">Households</div><div className="benchmark-metric-val">{calcExecHH.toLocaleString()}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Beneficiaries</div><div className="benchmark-metric-val">{calcExecBen.toLocaleString()}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Convergence</div><div className="benchmark-metric-val">₹{calcExecConv} L</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Income Gen</div><div className="benchmark-metric-val">₹{calcExecRev} L</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">NTFP Revenue</div><div className="benchmark-metric-val">₹{calcExecNtfp} L</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Tourists</div><div className="benchmark-metric-val">{calcExecTourists.toLocaleString()}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Fund Util</div><div className="benchmark-metric-val">{calcExecUtil}%</div></div>
            </div>"""

if 'calcExecNtfp' in content:
    content = re.sub(exec_bench_old, exec_bench_new, content, flags=re.DOTALL)
else:
    print("WARNING: calcExecNtfp missing from previous run? Rerun fix_exec_grid.py if needed, though we already did.")
    content = re.sub(exec_bench_old, exec_bench_new, content, flags=re.DOTALL)

# Fix SHG Benchmarks
shg_bench_old = r'<div className="benchmark-metrics">\s*<div className="benchmark-metric"><div className="benchmark-metric-label">Total SHGs</div><div className="benchmark-metric-val">\{calcShgCount\}</div></div>.*?<div className="benchmark-metric-label">Total Profit</div><div className="benchmark-metric-val">[^<]+</div></div>\s*</div>'

shg_bench_new = """<div className="benchmark-metrics">
              <div className="benchmark-metric"><div className="benchmark-metric-label">Total SHGs</div><div className="benchmark-metric-val">{calcShgCount}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Total Members</div><div className="benchmark-metric-val">{calcShgMembers}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Women Members</div><div className="benchmark-metric-val">{calcShgMembers} (100%)</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">ST Members</div><div className="benchmark-metric-val">{calcShgST} ({calcShgSTPercent}%)</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Total Revenue</div><div className="benchmark-metric-val">₹{(parseFloat(calcShgRev) > 100 ? (parseFloat(calcShgRev)/100).toFixed(2) + " Cr" : calcShgRev + " L")}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Total Profit</div><div className="benchmark-metric-val">₹{calcShgProfit} L</div></div>
            </div>"""

content = re.sub(shg_bench_old, shg_bench_new, content, flags=re.DOTALL)

# Fix Livelihood Benchmarks
liv_bench_old = r'<div className="benchmark-metrics">\s*<div className="benchmark-metric"><div className="benchmark-metric-label">Total Projects</div><div className="benchmark-metric-val">30</div></div>.*?<div className="benchmark-metric-label">Avg Income Increase</div><div className="benchmark-metric-val" style={{ color: \'#10b981\' }}>\{livIncSurge\}%</div></div>\s*</div>'

liv_bench_new = """<div className="benchmark-metrics">
              <div className="benchmark-metric"><div className="benchmark-metric-label">Total Projects</div><div className="benchmark-metric-val">{calcLivProjects}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Total Beneficiaries</div><div className="benchmark-metric-val">{calcLivBen}</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Investment Support</div><div className="benchmark-metric-val">₹{calcLivInv} Lakhs</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Income Before</div><div className="benchmark-metric-val">₹{livIncB.toLocaleString()} / yr</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Income After</div><div className="benchmark-metric-val">₹{livIncA.toLocaleString()} / yr</div></div>
              <div className="benchmark-metric"><div className="benchmark-metric-label">Avg Income Increase</div><div className="benchmark-metric-val" style={{ color: '#10b981' }}>{livIncSurge}%</div></div>
            </div>"""

content = re.sub(liv_bench_old, liv_bench_new, content, flags=re.DOTALL)

with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Benchmarks fixed.")
