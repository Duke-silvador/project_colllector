import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

benchmark_html = """<div className="benchmark-bar" style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #064e3b 100%)' }}>
              <div className="benchmark-title">
                <h3><Activity size={20} /> Official Overview KPI Benchmarks</h3>
                <p>Consolidated performance across all ranges</p>
              </div>
              <div className="benchmark-metrics">
                <div className="benchmark-metric"><div className="benchmark-metric-label">Beneficiaries</div><div className="benchmark-metric-val">{totalBeneficiaries.toLocaleString()}</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Income Surge</div><div className="benchmark-metric-val">+{incomeSurge}%</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Total Revenue</div><div className="benchmark-metric-val">₹{(totalRevenue > 100 ? (totalRevenue / 100).toFixed(2) + " Cr" : totalRevenue.toFixed(2) + " L")}</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Net Profit</div><div className="benchmark-metric-val">₹{totalProfit.toFixed(1)} L</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Credit Linkage</div><div className="benchmark-metric-val">₹{totalBankLinkage.toFixed(2)} L</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Govt Support</div><div className="benchmark-metric-val">₹{govtSupport.toFixed(2)} L</div></div>
                <div className="benchmark-metric"><div className="benchmark-metric-label">Women Included</div><div className="benchmark-metric-val">100%</div></div>
              </div>
            </div>"""

# Replace the exact anchor line
anchor_pattern = r"\{activeTab === 'overall' && \(\s*<div className=\"tab-content\" style=\{\{ animation: 'fadeIn 0\.3s ease-out' \}\}>\s*<div className=\"kpi-grid-6\">"

new_anchor = f"{{activeTab === 'overall' && (\n          <div className=\"tab-content\" style={{{{ animation: 'fadeIn 0.3s ease-out' }}}}>\n            {benchmark_html}\n            <div className=\"kpi-grid-6\">"

if 'Official Overview KPI Benchmarks' not in content:
    content = re.sub(anchor_pattern, new_anchor, content)
    with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Added Overview Benchmark Bar.")
else:
    print("Already added.")
