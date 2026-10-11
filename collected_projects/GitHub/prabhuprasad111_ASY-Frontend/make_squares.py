import re

with open("src/components/SimilipalMap.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the click handler
old_handler = """  const handleSvgClick = (e: React.MouseEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const path = target.closest('path');
    if (path) {
      const range = path.getAttribute('data-range');"""

new_handler = """  const handleSvgClick = (e: React.MouseEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const path = target.closest('[data-range]');
    if (path) {
      const range = path.getAttribute('data-range');"""

content = content.replace(old_handler, new_handler)

# Replace the SVG content
# From <svg ...> to </svg>
svg_pattern = r'<svg className="similipal-map-svg" .*?</svg>'

new_svg = """<svg className="similipal-map-svg" onClick={handleSvgClick} viewBox="0 0 750 820" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))', cursor: 'pointer' }}>
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

              {/* Grid Background/Outline Optional */}
              <rect x="125" y="80" width="500" height="660" rx="20" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,4" />

              {/* NORTH DIVISION SQUARES */}
              <g data-range="Talabandha" data-division="north" style={{ transition: 'all 0.3s ease' }}>
                <rect x="295" y="90" width="156" height="156" rx="12" fill={selectedRange === 'Talabandha' ? 'url(#northGrad)' : '#3b82f6'} stroke={selectedRange === 'Talabandha' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Talabandha' ? '4' : '2'} />
                <text x="373" y="168" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Talabandha</text>
              </g>

              <g data-range="Pithabata North" data-division="north" style={{ transition: 'all 0.3s ease' }}>
                <rect x="455" y="90" width="156" height="156" rx="12" fill={selectedRange === 'Pithabata North' ? 'url(#northGrad)' : '#3b82f6'} stroke={selectedRange === 'Pithabata North' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Pithabata North' ? '4' : '2'} />
                <text x="533" y="168" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Pithabata N.</text>
              </g>

              <g data-range="Gudgudia" data-division="north" style={{ transition: 'all 0.3s ease' }}>
                <rect x="135" y="90" width="156" height="156" rx="12" fill={selectedRange === 'Gudgudia' ? 'url(#northGrad)' : '#3b82f6'} stroke={selectedRange === 'Gudgudia' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Gudgudia' ? '4' : '2'} />
                <text x="213" y="168" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Gudgudia</text>
              </g>

              <g data-range="Nawana North" data-division="north" style={{ transition: 'all 0.3s ease' }}>
                <rect x="295" y="250" width="156" height="156" rx="12" fill={selectedRange === 'Nawana North' ? 'url(#northGrad)' : '#3b82f6'} stroke={selectedRange === 'Nawana North' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Nawana North' ? '4' : '2'} />
                <text x="373" y="328" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Nawana N.</text>
              </g>

              <g data-range="Barehipani" data-division="north" style={{ transition: 'all 0.3s ease' }}>
                <rect x="295" y="410" width="156" height="156" rx="12" fill={selectedRange === 'Barehipani' ? 'url(#northGrad)' : '#3b82f6'} stroke={selectedRange === 'Barehipani' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Barehipani' ? '4' : '2'} />
                <text x="373" y="488" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Barehipani</text>
              </g>


              {/* SOUTH DIVISION SQUARES */}
              <g data-range="Pithabata South" data-division="south" style={{ transition: 'all 0.3s ease' }}>
                <rect x="455" y="250" width="156" height="156" rx="12" fill={selectedRange === 'Pithabata South' ? 'url(#southGrad)' : '#10b981'} stroke={selectedRange === 'Pithabata South' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Pithabata South' ? '4' : '2'} />
                <text x="533" y="328" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Pithabata S.</text>
              </g>

              <g data-range="Dukura" data-division="south" style={{ transition: 'all 0.3s ease' }}>
                <rect x="455" y="410" width="156" height="156" rx="12" fill={selectedRange === 'Dukura' ? 'url(#southGrad)' : '#10b981'} stroke={selectedRange === 'Dukura' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Dukura' ? '4' : '2'} />
                <text x="533" y="488" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Dukura</text>
              </g>

              <g data-range="Kendumundi" data-division="south" style={{ transition: 'all 0.3s ease' }}>
                <rect x="135" y="250" width="156" height="156" rx="12" fill={selectedRange === 'Kendumundi' ? 'url(#southGrad)' : '#10b981'} stroke={selectedRange === 'Kendumundi' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Kendumundi' ? '4' : '2'} />
                <text x="213" y="328" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Kendumundi</text>
              </g>

              <g data-range="Thakurmunda" data-division="south" style={{ transition: 'all 0.3s ease' }}>
                <rect x="135" y="410" width="156" height="156" rx="12" fill={selectedRange === 'Thakurmunda' ? 'url(#southGrad)' : '#10b981'} stroke={selectedRange === 'Thakurmunda' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Thakurmunda' ? '4' : '2'} />
                <text x="213" y="488" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Thakurmunda</text>
              </g>

              <g data-range="Podadiha" data-division="south" style={{ transition: 'all 0.3s ease' }}>
                <rect x="295" y="570" width="156" height="156" rx="12" fill={selectedRange === 'Podadiha' ? 'url(#southGrad)' : '#10b981'} stroke={selectedRange === 'Podadiha' ? '#f59e0b' : '#fff'} strokeWidth={selectedRange === 'Podadiha' ? '4' : '2'} />
                <text x="373" y="648" fontSize="13" fill="#fff" fontWeight="bold" textAnchor="middle">Podadiha</text>
              </g>

              {/* Overlays / Decorations */}
              {/* Sanctuary Line (dashed) spanning across the grid */}
              <path d="M 213,240 C 273,240 373,240 533,240" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="6,6" opacity="0.6" style={{ pointerEvents: 'none' }} />
              
              {/* Landmarks */}
              <circle cx="373" cy="440" r="8" fill="#0284c7" stroke="#fff" strokeWidth="2" style={{ pointerEvents: 'none' }}><title>Barehipani Waterfall</title></circle>
              <circle cx="430" cy="270" r="8" fill="#0284c7" stroke="#fff" strokeWidth="2" style={{ pointerEvents: 'none' }}><title>Joranda Waterfall</title></circle>
              
              <path d="M 363,280 L 373,260 L 383,280 Z" fill="#f59e0b" style={{ pointerEvents: 'none' }}><title>Nawana Valley Meadow</title></path>
              <path d="M 333,520 L 343,500 L 353,520 Z" fill="#f59e0b" style={{ pointerEvents: 'none' }}><title>Chahala Wildlife Meadow</title></path>
              
              <rect x="585" y="160" width="12" height="12" fill="#dc2626" style={{ pointerEvents: 'none' }}><title>Pithabata Entry Gate</title></rect>
              <rect x="145" y="160" width="12" height="12" fill="#dc2626" style={{ pointerEvents: 'none' }}><title>Jashipur Entry Gate</title></rect>

              <g transform="translate(670, 120)" style={{ pointerEvents: 'none' }}>
                <circle cx="0" cy="0" r="15" fill="#fff" stroke="#cbd5e1" strokeWidth="1"/>
                <path d="M 0,-10 L 4,0 L -4,0 Z" fill="#ef4444"/>
                <path d="M 0,10 L 4,0 L -4,0 Z" fill="#94a3b8"/>
                <text x="0" y="-12" fontSize="10" fontWeight="bold" textAnchor="middle" fill="#64748b">N</text>
              </g>

            </svg>"""

content = re.sub(svg_pattern, new_svg, content, flags=re.DOTALL)

with open("src/components/SimilipalMap.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Changed Map to Square Grid.")
