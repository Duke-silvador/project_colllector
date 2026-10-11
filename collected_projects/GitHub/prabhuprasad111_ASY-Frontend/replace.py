import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = '''  return (
    <header className="topbar" style={{ position: 'relative', borderTop: '4px solid transparent', background: 'linear-gradient(to right, #1d4ed8, #059669, #d97706, #0284c7) top / 100% 4px no-repeat, white', padding: '10px 24px', height: 'auto', minHeight: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', gap: '12px' }}>
        
        {/* Left Side: Mobile Toggle & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '0 0 auto' }}>
          <button className="toggle-btn" onClick={toggleSidebar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <Menu size={24} color="#334155" />
          </button>
          

        {/* Center: Title & Badges */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', padding: '2px 10px', borderRadius: '12px', color: '#065f46', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', border: '1px solid #a7f3d0' }}>
            <Trees size={12} /> GOVERNMENT OF ODISHA � FOREST, ENVIRONMENT & CLIMATE CHANGE DEPARTMENT
          </div>
          <h1 style={{ color: '#025c99', fontSize: '1.4rem', fontWeight: 900, margin: '6px 0', letterSpacing: '0.01em', textTransform: 'uppercase' }}>
            Ama Similipal Yojna: Analysis & Monitoring
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
            <PawPrint size={14} /> SIMILIPAL TIGER RESERVE
          </div>
        </div>

        {/* Right: Actions */}
        <div className="top-actions" style={{ flex: '0 0 auto', display: 'flex', gap: '8px', flexDirection: 'row', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', width: '130px', justifyContent: 'center', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>
              <Printer size={14} /> Export Report
            </button>
            <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', width: '130px', justifyContent: 'center' }}>
              <FileSpreadsheet size={14} /> Export CSV
            </button>
          </div>
        </div>

      </div>
    </header>'''

new_code = re.sub(r'  return \(\n    <header className="topbar">.*?</header>', replacement, code, flags=re.DOTALL)
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(new_code)
