import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Define the exact regex to find the block
pattern = re.compile(
    r'<div className="benchmark-bar" style={{ background: \'linear-gradient\(90deg, #1e3a8a 0%, #064e3b 100%\)\'.*?</div>\s*</div>\s*</div>',
    re.DOTALL
)

replacement = """<div className="benchmark-bar" style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #064e3b 100%)' }}>
              <div className="benchmark-title">
                <h3><Activity size={20} color="#34d399" /> Official Executive Dashboard KPI Benchmarks</h3>
                <p>Verified with Field Monitoring Records (Excel Sheet: Executive Dashboard)</p>
              </div>
              <div className="benchmark-metrics">
                <div className="benchmark-metric"><div className="benchmark-metric-label">Households</div><div className="benchmark-metric-val">{calcExecHH.toLocaleString()}</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Beneficiaries</div><div className="benchmark-metric-val">{calcExecBen.toLocaleString()}</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Convergence</div><div className="benchmark-metric-val">₹583 Lakhs</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Income Gen</div><div className="benchmark-metric-val">₹402.7 Lakhs</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">NTFP Revenue</div><div className="benchmark-metric-val">₹202.2 Lakhs</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Tourists</div><div className="benchmark-metric-val">7,265</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Fund Util</div><div className="benchmark-metric-val">85%</div></div>
              </div>
            </div>"""

new_content, count = pattern.subn(replacement, content)
if count > 0:
    with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully!")
else:
    print("Pattern not found!")
