import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. First add the new calculations to the dynamic block
new_calcs = """  const calcExecConv = filteredExecutiveTable.reduce((a,c) => a + parseAmt(c.conv), 0).toFixed(1);
  const calcExecTourists = filteredExecutiveTable.reduce((a,c) => a + c.tour, 0);
  const calcExecTrain = filteredExecutiveTable.reduce((a,c) => a + c.train, 0);
  const calcExecProj = filteredExecutiveTable.reduce((a,c) => a + c.proj, 0);
  const calcExecNtfp = filteredExecutiveTable.reduce((a,c) => a + parseAmt(c.ntfp), 0).toFixed(1);
  const calcExecEdc = filteredExecutiveTable.reduce((a,c) => a + c.edc, 0);
  const calcExecShg = filteredExecutiveTable.reduce((a,c) => a + c.shg, 0);"""

content = content.replace("  const calcExecConv = filteredExecutiveTable.reduce((a,c) => a + parseAmt(c.conv), 0).toFixed(1);", new_calcs)

# 2. Now replace the 8 custom grid cards in the Executive tab
exec_grid_old_pattern = r'<div className="grid-12" style={{ marginBottom: \'24px\', gridTemplateColumns: \'repeat\(4, 1fr\)\', gap: \'20px\'\s*}}>.*?<div className="kpi-sub">Active Enterprise Hubs</div>\s*</div>\s*</div>'

exec_grid_new = """<div className="grid-12" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div className="kpi-card" style={{ borderTopColor: '#3b82f6', gridColumn: 'span 1' }}>
                <div className="kpi-title">HOUSEHOLDS COVERED <Home size={18} color="#3b82f6" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>{calcExecHH.toLocaleString()}</div>
                <div className="kpi-sub">Across {calcExecVillage} Forest Villages</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#10b981', gridColumn: 'span 1' }}>
                <div className="kpi-title">TOTAL FIELD BENEFICIARIES <Users size={18} color="#10b981" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>{calcExecBen.toLocaleString()}</div>
                <div className="kpi-sub">{calcExecEdc} EDCs • {calcExecShg} Active SHGs</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#f59e0b', gridColumn: 'span 1' }}>
                <div className="kpi-title">SCHEME CONVERGENCE <IndianRupee size={18} color="#f59e0b" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>₹{calcExecConv} L</div>
                <div className="kpi-sub">Multi-Departmental Interventions</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#a855f7', gridColumn: 'span 1' }}>
                <div className="kpi-title">TOTAL INCOME GENERATED <PiggyBank size={18} color="#a855f7" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>₹{calcExecRev} L</div>
                <div className="kpi-sub">NTFP Share: <span style={{ color: '#f59e0b', fontWeight: 700 }}>₹{calcExecNtfp} L</span></div>
              </div>
  
              <div className="kpi-card" style={{ borderTopColor: '#14b8a6', gridColumn: 'span 1' }}>
                <div className="kpi-title">TOURISM FOOTFALL <Globe size={18} color="#14b8a6" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>{calcExecTourists.toLocaleString()}</div>
                <div className="kpi-sub">Gudgudia & Barehipani Hotspots</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#ef4444', gridColumn: 'span 1' }}>
                <div className="kpi-title">TRAINING PARTICIPANTS <GraduationCap size={18} color="#ef4444" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>{calcExecTrain.toLocaleString()}</div>
                <div className="kpi-sub">Capacity Building & Skill Hubs</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#10b981', gridColumn: 'span 1' }}>
                <div className="kpi-title">AVERAGE FUND UTILIZATION <PieChartIcon size={18} color="#10b981" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>{calcExecUtil}%</div>
                <div className="kpi-sub">Peak 96% in Thakurmunda</div>
              </div>
              <div className="kpi-card" style={{ borderTopColor: '#3b82f6', gridColumn: 'span 1' }}>
                <div className="kpi-title">LIVELIHOOD UNITS <Blocks size={18} color="#3b82f6" /></div>
                <div className="kpi-val" style={{ fontSize: '1.8rem' }}>{calcExecProj} Units</div>
                <div className="kpi-sub">Active Enterprise Hubs</div>
              </div>
            </div>"""

new_content = re.sub(exec_grid_old_pattern, exec_grid_new, content, flags=re.DOTALL)

with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Executive Dashboard KPI Grids fixed successfully.")
