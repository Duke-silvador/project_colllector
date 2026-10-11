import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Overall Tab KPI Grid
overall_kpi = """<div className="kpi-grid-6">
              <div className="kpi-card" style={{ borderTopColor: '#3b82f6' }}>
                <div className="kpi-title">Total Tribal Beneficiaries <Globe size={18} color="#3b82f6" /></div>
                <div className="kpi-val">{totalBeneficiaries}</div>
                <div className="kpi-sub"><span style={{ color: '#10b981' }}>{totalBeneficiaries} Women</span> across {filteredRangeData.length * 3} Villages</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#10b981' }}>
                <div className="kpi-title">Average Income Surge <LineChart size={18} color="#10b981" /></div>
                <div className="kpi-val">+{incomeSurge}%</div>
                <div className="kpi-sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>₹{avgIncomeBefore.toLocaleString("en-IN")} Before</span> <span>➔</span> <span style={{ color: '#10b981' }}>₹{avgIncomeAfter.toLocaleString("en-IN")} After</span>
                </div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#f59e0b' }}>
                <div className="kpi-title">Total Revenue Generated <PiggyBank size={18} color="#f59e0b" /></div>
                <div className="kpi-val">₹{(totalRevenue > 100 ? (totalRevenue / 100).toFixed(2) + " Cr" : totalRevenue.toFixed(2) + " L")}</div>
                <div className="kpi-sub">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Net Profit: <strong style={{ color: '#f59e0b' }}>₹{totalProfit.toFixed(1)} Lakhs ({profitMargin}% margin)</strong></span>
                  </div>
                </div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#8b5cf6' }}>
                <div className="kpi-title">Govt Investment & Support <IndianRupee size={18} color="#8b5cf6" /></div>
                <div className="kpi-val">₹{govtSupport.toFixed(2)} L</div>
                <div className="kpi-sub"><span style={{ color: '#8b5cf6' }}>Revolving Fund: ₹{totalRevFund.toFixed(1)} Lakhs</span></div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#06b6d4' }}>
                <div className="kpi-title">Institutional Credit Linkage <Briefcase size={18} color="#06b6d4" /></div>
                <div className="kpi-val">₹{totalBankLinkage.toFixed(2)} L</div>
                <div className="kpi-sub">Active Bank Loans: <span style={{ color: '#06b6d4' }}>{totalActiveLoans} Accounts</span></div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#f43f5e' }}>
                <div className="kpi-title">Tribal & Gender Inclusion <Users size={18} color="#f43f5e" /></div>
                <div className="kpi-val">100% Women</div>
                <div className="kpi-sub" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#10b981' }}>{stPercentage}% ST Membership</span> <span>({totalST} ST Members)</span>
                </div>
              </div>
            </div>"""

# 2. SHG Tab KPI Grid
shg_kpi = """<div className="kpi-grid-6">
              <div className="kpi-card" style={{ borderTopColor: '#3b82f6' }}>
                <div className="kpi-title">Active SHG Groups <Activity size={18} color="#3b82f6" /></div>
                <div className="kpi-val">{calcShgCount}</div>
                <div className="kpi-sub">{calcShgMembers} Women Beneficiaries</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#f59e0b' }}>
                <div className="kpi-title">Total Gross Revenue <IndianRupee size={18} color="#f59e0b" /></div>
                <div className="kpi-val">₹{calcShgRev} L</div>
                <div className="kpi-sub">Generated across {calcShgCount} SHGs</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#10b981' }}>
                <div className="kpi-title">Total Annual Profit <LineChart size={18} color="#10b981" /></div>
                <div className="kpi-val">₹{calcShgProfit} L</div>
                <div className="kpi-sub">Avg Profit / SHG: <span style={{ color: '#10b981' }}>₹{calcShgCount ? (parseFloat(calcShgProfit) / calcShgCount).toFixed(2) : 0} Lakhs</span></div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#8b5cf6' }}>
                <div className="kpi-title">Total Bank Linkage <Briefcase size={18} color="#8b5cf6" /></div>
                <div className="kpi-val">₹{totalBankLinkage.toFixed(2)} L</div>
                <div className="kpi-sub">{totalActiveLoans} Active Loan Accounts</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#06b6d4' }}>
                <div className="kpi-title">Total Group Savings <PiggyBank size={18} color="#06b6d4" /></div>
                <div className="kpi-val">₹{totalSavings.toFixed(2)} L</div>
                <div className="kpi-sub">Revolving Fund: <span style={{ color: '#3b82f6' }}>₹{totalRevFund.toFixed(1)} Lakhs</span></div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#f43f5e' }}>
                <div className="kpi-title">Conservation Linkage <Compass size={18} color="#f43f5e" /></div>
                <div className="kpi-val" style={{ fontSize: '1.4rem' }}>11 NTFP / 3 Tourism</div>
                <div className="kpi-sub">Forest-dependent sustainable models</div>
              </div>
            </div>"""

# 3. Livelihood Tab KPI Grid
liv_kpi = """<div className="kpi-grid-6">
              <div className="kpi-card" style={{ borderTopColor: '#10b981' }}>
                <div className="kpi-title">Livelihood Projects <Trees size={18} color="#10b981" /></div>
                <div className="kpi-val">{calcLivProjects}</div>
                <div className="kpi-sub">Across {filteredRangeData.length} Forest Ranges</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#3b82f6' }}>
                <div className="kpi-title">Investment Support <IndianRupee size={18} color="#3b82f6" /></div>
                <div className="kpi-val">₹{calcLivInv} L</div>
                <div className="kpi-sub">Govt Seed Capital</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#f59e0b' }}>
                <div className="kpi-title">Household Income Transformation <LineChart size={18} color="#f59e0b" /></div>
                <div className="kpi-val">+{livIncSurge}%</div>
                <div className="kpi-sub" style={{ color: '#10b981' }}>Avg Leap Post-Intervention</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#8b5cf6' }}>
                <div className="kpi-title">NTFP Aggregation Units <Leaf size={18} color="#8b5cf6" /></div>
                <div className="kpi-val">13 Projects</div>
                <div className="kpi-sub">Highest Growth Sector</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#06b6d4' }}>
                <div className="kpi-title">Livestock Interventions <ShieldCheck size={18} color="#06b6d4" /></div>
                <div className="kpi-val">8 Projects</div>
                <div className="kpi-sub">Goatery & Poultry Units</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#f43f5e' }}>
                <div className="kpi-title">Eco-Tourism & Agri <Tent size={18} color="#f43f5e" /></div>
                <div className="kpi-val" style={{ fontSize: '1.4rem' }}>3 Tourism / 5 Agri</div>
                <div className="kpi-sub">Diversified Income Portfolios</div>
              </div>
            </div>"""

# Find the three <div className="kpi-grid-6"> blocks using a precise regex
# It starts with <div className="kpi-grid-6"> and ends with the first matching </div> </div> </div> (since it has 6 cards inside)
# Wait, actually it's easier to just split the file by `<div className="kpi-grid-6">` and rewrite.

parts = content.split('<div className="kpi-grid-6">')

# parts[0] is everything before the first grid
# parts[1] starts with the contents of the first grid
# We need to find the end of each grid block to preserve the rest.

def get_end_of_grid(text):
    # Find the closing </div> of the grid-12. The kpi-grid-6 has 6 cards.
    # Each card is <div className="kpi-card" ...> ... </div>
    # The grid itself closes with a </div>
    # We can just look for the first `<div className="grid-12"` or `<article` or whatever follows it.
    
    # Actually, we can count open/close divs.
    open_divs = 1 # We already consumed the <div className="kpi-grid-6">
    pos = 0
    while pos < len(text) and open_divs > 0:
        next_open = text.find('<div', pos)
        next_close = text.find('</div', pos)
        
        if next_open != -1 and next_open < next_close:
            open_divs += 1
            pos = next_open + 4
        elif next_close != -1:
            open_divs -= 1
            pos = next_close + 6
        else:
            break
    
    return pos

end1 = get_end_of_grid(parts[1])
rest1 = parts[1][end1:]

end2 = get_end_of_grid(parts[2])
rest2 = parts[2][end2:]

end3 = get_end_of_grid(parts[3])
rest3 = parts[3][end3:]

new_content = parts[0] + overall_kpi + rest1 + shg_kpi + rest2 + liv_kpi + rest3

with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("KPI Grids fixed successfully.")
