import re

def polyfy(d_str):
    # Match C command: C x1,y1 x2,y2 x3,y3
    pattern = r'C\s+[\d\.\-]+\s*,\s*[\d\.\-]+\s+[\d\.\-]+\s*,\s*[\d\.\-]+\s+([\d\.\-]+)\s*,\s*([\d\.\-]+)'
    return re.sub(pattern, r'L \1,\2', d_str)

paths = {
    "outer": "M 375,65 C 500,70 635,130 680,240 C 720,340 705,480 660,600 C 610,720 480,795 360,795 C 220,795 130,710 95,580 C 65,470 75,320 135,210 C 190,115 285,65 375,65 Z",
    "Talabandha": "M 375,95 C 335,95 300,105 275,115 C 230,145 205,185 220,215 L 280,240 C 345,215 410,210 465,230 C 475,175 440,125 375,95 Z",
    "Pithabata North": "M 375,95 C 440,125 475,175 465,230 C 485,275 485,305 495,335 C 565,340 625,310 655,275 C 665,210 635,165 600,160 C 525,125 440,100 375,95 Z",
    "Gudgudia": "M 275,115 L 220,215 L 280,240 C 285,285 285,325 275,365 L 250,430 C 195,435 150,420 120,390 C 95,320 115,245 170,200 C 205,160 240,130 275,115 Z",
    "Nawana North": "M 280,240 C 345,215 410,210 465,230 C 485,275 485,305 495,335 L 460,365 C 400,380 340,380 275,365 C 285,325 285,285 280,240 Z",
    "Barehipani": "M 275,365 C 340,380 400,380 460,365 C 470,415 475,445 475,475 L 440,510 C 395,525 350,525 305,505 L 250,430 L 275,365 Z",
    "Pithabata South": "M 495,335 C 565,340 625,310 655,275 C 665,335 655,420 620,520 C 560,505 515,490 475,475 C 475,445 470,415 460,365 L 495,335 Z",
    "Dukura": "M 475,475 C 515,490 560,505 620,520 C 605,585 575,640 540,670 L 470,640 C 455,595 448,555 440,510 L 475,475 Z",
    "Podadiha": "M 305,505 C 350,525 395,525 440,510 C 448,555 455,595 470,640 C 460,685 435,730 400,755 C 365,750 330,710 300,610 C 300,575 302,540 305,505 Z",
    "Kendumundi": "M 120,390 C 150,420 195,435 250,430 L 305,505 C 302,540 300,575 300,610 C 260,615 220,605 185,580 C 155,540 135,465 120,390 Z",
    "Thakurmunda": "M 300,610 C 330,710 365,750 400,755 C 375,775 320,785 260,770 C 210,750 180,680 185,580 C 220,605 260,615 300,610 Z"
}

poly_paths = {k: polyfy(v) for k,v in paths.items()}

jsx_code = f"""import React from 'react';
import {{ Map, MapPin, TreePine, Leaf, Home, Landmark, CheckCircle }} from 'lucide-react';
import {{ rangeProfiles }} from '../data/mapData';

interface SimilipalMapProps {{
  selectedRange: string;
  onRangeSelect: (range: string) => void;
}}

export default function SimilipalMap({{ selectedRange, onRangeSelect }}: SimilipalMapProps) {{
  const profile = rangeProfiles[selectedRange as keyof typeof rangeProfiles] || Object.values(rangeProfiles)[0];
  const isNorth = profile.division === "north";

  const handleSvgClick = (e: React.MouseEvent<SVGElement>) => {{
    const target = e.target as SVGElement;
    const el = target.closest('[data-range]');
    if (el) {{
      const range = el.getAttribute('data-range');
      if (range && onRangeSelect) {{
        onRangeSelect(range);
      }}
    }}
  }};

  return (
    <div className="map-analytics-section" style={{{{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '24px' }}}}>
      <div className="map-section-header" style={{{{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}}}>
        <div>
          <h3 style={{{{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}}}>
            <Map size={{20}} color="#2563eb" /> ASY Field Analytics
          </h3>
          <p style={{{{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}}}>
            Click any Forest Range on the official administrative GIS reserve map to inspect local welfare metrics, villages, and ecological landmarks.
          </p>
        </div>
      </div>

      <div className="map-dashboard-grid" style={{{{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}}}>
        
        {{/* Left: SVG Map Canvas */}}
        <div className="map-canvas-card" style={{{{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}}}>
          <div className="map-svg-wrapper" style={{{{ width: '100%', maxWidth: '400px', margin: '0 auto' }}}}>
            <svg className="similipal-map-svg" onClick={{handleSvgClick}} viewBox="0 0 750 820" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style={{{{ width: '100%', height: 'auto', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))', cursor: 'pointer' }}}}>
              <defs>
                <linearGradient id="northGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.95"/>
                </linearGradient>
                <linearGradient id="southGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9"/>
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.95"/>
                </linearGradient>
              </defs>

              <path className="sanctuary-outer-ring" d="{poly_paths['outer']}" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,4" />

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Talabandha' ? 'url(#northGrad)' : '#3b82f6', stroke: selectedRange === 'Talabandha' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Talabandha' ? '4' : '2' }}}} data-range="Talabandha" data-division="north" d="{poly_paths['Talabandha']}">
                <title>Talabandha Range - Similipal North Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Pithabata North' ? 'url(#northGrad)' : '#3b82f6', stroke: selectedRange === 'Pithabata North' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Pithabata North' ? '4' : '2' }}}} data-range="Pithabata North" data-division="north" d="{poly_paths['Pithabata North']}">
                <title>Pithabata North Range - Similipal North Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Gudgudia' ? 'url(#northGrad)' : '#3b82f6', stroke: selectedRange === 'Gudgudia' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Gudgudia' ? '4' : '2' }}}} data-range="Gudgudia" data-division="north" d="{poly_paths['Gudgudia']}">
                <title>Gudgudia Range - Similipal North Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Nawana North' ? 'url(#northGrad)' : '#3b82f6', stroke: selectedRange === 'Nawana North' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Nawana North' ? '4' : '2' }}}} data-range="Nawana North" data-division="north" d="{poly_paths['Nawana North']}">
                <title>Nawana North Range - Similipal North Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Barehipani' ? 'url(#northGrad)' : '#3b82f6', stroke: selectedRange === 'Barehipani' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Barehipani' ? '4' : '2' }}}} data-range="Barehipani" data-division="north" d="{poly_paths['Barehipani']}">
                <title>Barehipani Range - Similipal North Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Pithabata South' ? 'url(#southGrad)' : '#10b981', stroke: selectedRange === 'Pithabata South' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Pithabata South' ? '4' : '2' }}}} data-range="Pithabata South" data-division="south" d="{poly_paths['Pithabata South']}">
                <title>Pithabata South Range - Similipal South Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Dukura' ? 'url(#southGrad)' : '#10b981', stroke: selectedRange === 'Dukura' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Dukura' ? '4' : '2' }}}} data-range="Dukura" data-division="south" d="{poly_paths['Dukura']}">
                <title>Dukura Range - Similipal South Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Podadiha' ? 'url(#southGrad)' : '#10b981', stroke: selectedRange === 'Podadiha' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Podadiha' ? '4' : '2' }}}} data-range="Podadiha" data-division="south" d="{poly_paths['Podadiha']}">
                <title>Podadiha Range - Similipal South Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Kendumundi' ? 'url(#southGrad)' : '#10b981', stroke: selectedRange === 'Kendumundi' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Kendumundi' ? '4' : '2' }}}} data-range="Kendumundi" data-division="south" d="{poly_paths['Kendumundi']}">
                <title>Kendumundi Range - Similipal South Wildlife Division</title>
              </path>

              <path style={{{{ transition: 'all 0.3s ease', fill: selectedRange === 'Thakurmunda' ? 'url(#southGrad)' : '#10b981', stroke: selectedRange === 'Thakurmunda' ? '#f59e0b' : '#fff', strokeWidth: selectedRange === 'Thakurmunda' ? '4' : '2' }}}} data-range="Thakurmunda" data-division="south" d="{poly_paths['Thakurmunda']}">
                <title>Thakurmunda Range - Similipal South Wildlife Division</title>
              </path>

              {{/* Sanctuary Line (dashed) */}}
              <path d="M 275,365 L 465,230" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="6,6" opacity="0.6"/>
              
              {{/* Overlays */}}
              <circle cx="210" cy="340" r="6" fill="#0284c7" stroke="#fff" strokeWidth="2" style={{{{ pointerEvents: 'none' }}}}><title>Barehipani Waterfall</title></circle>
              <circle cx="340" cy="190" r="6" fill="#0284c7" stroke="#fff" strokeWidth="2" style={{{{ pointerEvents: 'none' }}}}><title>Joranda Waterfall</title></circle>
              
              <path d="M 200,500 L 210,480 L 220,500 Z" fill="#f59e0b" style={{{{ pointerEvents: 'none' }}}}><title>Nawana Valley Meadow</title></path>
              <path d="M 330,680 L 340,660 L 350,680 Z" fill="#f59e0b" style={{{{ pointerEvents: 'none' }}}}><title>Chahala Wildlife Meadow</title></path>
              
              <rect x="530" y="220" width="10" height="10" fill="#dc2626" style={{{{ pointerEvents: 'none' }}}}><title>Pithabata Entry Gate</title></rect>
              <rect x="190" y="110" width="10" height="10" fill="#dc2626" style={{{{ pointerEvents: 'none' }}}}><title>Jashipur Entry Gate</title></rect>

              <g transform="translate(650, 150)" style={{{{ pointerEvents: 'none' }}}}>
                <circle cx="0" cy="0" r="15" fill="#fff" stroke="#cbd5e1" strokeWidth="1"/>
                <path d="M 0,-10 L 4,0 L -4,0 Z" fill="#ef4444"/>
                <path d="M 0,10 L 4,0 L -4,0 Z" fill="#94a3b8"/>
                <text x="0" y="-12" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#64748b">N</text>
              </g>

              {{/* Labels (subset) */}}
              <text x="320" y="210" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Nawana N.</text>
              <text x="375" y="445" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Barehipani</text>
              <text x="560" y="420" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Pithabata S.</text>
              <text x="495" y="235" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Pithabata N.</text>
              <text x="375" y="145" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Talabandha</text>
              <text x="180" y="295" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Gudgudia</text>
              <text x="180" y="500" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Kendumundi</text>
              <text x="330" y="585" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Podadiha</text>
              <text x="495" y="555" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Dukura</text>
              <text x="245" y="665" fontSize="11" fill="#fff" fontWeight="bold" textAnchor="middle" opacity="0.9" style={{{{ pointerEvents: 'none' }}}}>Thakurmunda</text>

            </svg>
          </div>

          <div style={{{{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}}}>
            <span style={{{{ display: 'flex', alignItems: 'center', gap: '4px' }}}}><span style={{{{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}}}></span> Similipal North Division</span>
            <span style={{{{ display: 'flex', alignItems: 'center', gap: '4px' }}}}><span style={{{{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}}}></span> Similipal South Division</span>
            <span style={{{{ display: 'flex', alignItems: 'center', gap: '4px' }}}}><span style={{{{ width: '12px', height: '12px', border: '2px dashed #8b5cf6', background: 'transparent' }}}}></span> Core Sanctuary Line</span>
            <span style={{{{ display: 'flex', alignItems: 'center', gap: '4px' }}}}><span style={{{{ width: '12px', height: '12px', background: '#0284c7', borderRadius: '50%' }}}}></span> Waterfalls</span>
            <span style={{{{ display: 'flex', alignItems: 'center', gap: '4px' }}}}><span style={{{{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }}}}></span> Wildlife Meadow</span>
            <span style={{{{ display: 'flex', alignItems: 'center', gap: '4px' }}}}><span style={{{{ width: '12px', height: '12px', background: '#dc2626', borderRadius: '2px' }}}}></span> Entry Gate</span>
          </div>
        </div>

        {{/* Right: Dossier Profile */}}
        <div className="map-dossier-card" style={{{{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column' }}}}>
          
          <div style={{{{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}}}>
            <div>
              <h2 style={{{{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}}}>
                <MapPin size={{22}} className={{isNorth ? 'text-blue-600' : 'text-emerald-600'}} color={{isNorth ? '#2563eb' : '#10b981'}} /> {{profile.name}} Range
              </h2>
              <div style={{{{ color: '#059669', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}}}>
                <TreePine size={{16}} /> {{profile.zone || 'Forest Buffer Zone'}}
              </div>
            </div>
            <span style={{{{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: isNorth ? '#eff6ff' : '#ecfdf5', color: isNorth ? '#1d4ed8' : '#047857' }}}}>
              {{isNorth ? 'Similipal North' : 'Similipal South'}}
            </span>
          </div>

          <div style={{{{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}}}>
            <div style={{{{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}}}>
              <div style={{{{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}}}>Covered Households</div>
              <div style={{{{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}}}>{{profile.households.toLocaleString()}} HH</div>
              <div style={{{{ fontSize: '0.75rem', color: '#64748b' }}}}>{{profile.beneficiaries.toLocaleString()}} Beneficiaries ({{profile.stMembers || profile.beneficiaries}} ST)</div>
            </div>

            <div style={{{{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}}}>
              <div style={{{{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}}}>SHG Enterprise Revenue</div>
              <div style={{{{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}}}>₹{{(profile.shgRevenue/100000).toFixed(2)}} L</div>
              <div style={{{{ fontSize: '0.75rem', color: '#64748b' }}}}>Net Profit: ₹{{(profile.shgProfit/100000).toFixed(2)}} L</div>
            </div>

            <div style={{{{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}}}>
              <div style={{{{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}}}>Income Surge (Post-Intervention)</div>
              <div style={{{{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}}}>+{{profile.incomeGrowth}}%</div>
              <div style={{{{ fontSize: '0.75rem', color: '#64748b' }}}}>₹{{Math.round(profile.incomeBefore/1000)}}k ➔ ₹{{Math.round(profile.incomeAfter/1000)}}k / HH / Yr</div>
            </div>

            <div style={{{{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}}}>
              <div style={{{{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}}}>Convergence & Tourism</div>
              <div style={{{{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}}}>₹{{profile.convergence || 41}} Lakhs</div>
              <div style={{{{ fontSize: '0.75rem', color: '#64748b' }}}}>Score: {{profile.avgScore || 82}}/100</div>
            </div>
          </div>

          <div style={{{{ marginBottom: '16px' }}}}>
            <h4 style={{{{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}}}>
              <Leaf size={{14}} color="#10b981" /> Core Enterprises & Activities
            </h4>
            <div style={{{{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}}}>
              {{(profile.keyActivities || ['Poultry Farming', 'Tamarind Processing', 'Vegetable Cultivation']).map(act => (
                <span key={{act}} style={{{{ padding: '4px 10px', background: '#ecfdf5', color: '#047857', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #a7f3d0' }}}}>
                  <CheckCircle size={{12}} /> {{act}}
                </span>
              ))}}
            </div>
          </div>

          <div style={{{{ marginBottom: '16px' }}}}>
            <h4 style={{{{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}}}>
              <Home size={{14}} color="#3b82f6" /> Key Target Villages
            </h4>
            <div style={{{{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}}}>
              {{(profile.villages || ['Digdiga', 'Gopinathpur', 'Balikhal']).slice(0, 5).map(vil => (
                <span key={{vil}} style={{{{ padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #bfdbfe' }}}}>
                  <MapPin size={{12}} /> {{vil}}
                </span>
              ))}}
            </div>
          </div>

          <div style={{{{ marginBottom: 'auto' }}}}>
            <h4 style={{{{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}}}>
              <Landmark size={{14}} color="#f59e0b" /> Notable Landmarks & Features
            </h4>
            <div style={{{{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}}}>
              {{(profile.landmarks || ['Budhabalanga River Basin', 'Eastern Buffer Fringe']).map(lm => (
                <span key={{lm}} style={{{{ padding: '4px 10px', background: '#fffbeb', color: '#b45309', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #fde68a' }}}}>
                  <CheckCircle size={{12}} /> {{lm}}
                </span>
              ))}}
            </div>
          </div>

          <button style={{{{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', marginTop: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}}}>
            <CheckCircle size={{16}} /> Dashboard Currently Filtered to {{profile.name}}
          </button>
          
        </div>
      </div>
    </div>
  );
}}
"""

with open("src/components/SimilipalMap.tsx", "w", encoding="utf-8") as f:
    f.write(jsx_code)

print("Map updated to angular low-poly style.")
