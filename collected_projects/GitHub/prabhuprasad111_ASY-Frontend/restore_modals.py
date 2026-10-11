import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Define the mapping of keywords in the title to (Modal Title, activeColumn)
mapping = {
    "Total Tribal Beneficiaries": ("Tribal Beneficiaries", "beneficiaries"),
    "Average Income Surge": ("Income Surge", "income"),
    "Total Revenue Generated": ("Revenue Generated", "income"),
    "Govt Investment & Support": ("Govt Support", "convergence"),
    "Institutional Credit Linkage": ("Credit Linkage", "convergence"),
    "Tribal & Gender Inclusion": ("Tribal & Gender Inclusion", "beneficiaries"),
    
    "HOUSEHOLDS COVERED": ("Households Covered", "hh"),
    "TOTAL FIELD BENEFICIARIES": ("Total Beneficiaries", "beneficiaries"),
    "SCHEME CONVERGENCE": ("Scheme Convergence", "convergence"),
    "TOTAL INCOME GENERATED": ("Total Income Generated", "income"),
    "TOURISM FOOTFALL": ("Tourism Footfall", "tourism"),
    "TRAINING PARTICIPANTS": ("Training Participants", "training"),
    "AVERAGE FUND UTILIZATION": ("Fund Utilization", "utilization"),
    "LIVELIHOOD UNITS": ("Livelihood Units", "projects"),
    
    "Active SHG Groups": ("Active SHG Groups", "shgs"),
    "Total Gross Revenue": ("Total Gross Revenue", "income"),
    "Total Annual Profit": ("Total Annual Profit", "income"),
    "Total Bank Linkage": ("Total Bank Linkage", "convergence"),
    "Total Group Savings": ("Total Group Savings", "income"),
    "Conservation Linkage": ("Conservation Linkage", "ntfp"),
    
    "Livelihood Projects": ("Livelihood Projects", "projects"),
    "Investment Support": ("Investment Support", "convergence"),
    "Household Income Transformation": ("Income Transformation", "income"),
    "NTFP Aggregation Units": ("NTFP Aggregation", "ntfp"),
    "Livestock Interventions": ("Livestock Interventions", "projects"),
    "Eco-Tourism & Agri": ("Eco-Tourism & Agri", "tourism"),
}

# Regex to match:
# <div className="kpi-card" style={{ borderTopColor: '#...', (other styles...)? }}>\s*<div className="kpi-title">TITLE_TEXT
# 
# Wait, some kpi-card divs have gridColumn: 'span 1'
pattern = re.compile(r'(<div className="kpi-card" style={{([^}]+)}}>\s*<div className="kpi-title">([^<]+)<)', re.IGNORECASE)

def replace_func(match):
    full_match = match.group(0)
    style_content = match.group(2).strip()
    title_raw = match.group(3).strip()
    
    # Check if we already added onClick cursor pointer
    if "cursor: 'pointer'" in style_content:
        return full_match
        
    title_clean = title_raw
    # Resolve the modal config
    modal_title = title_clean
    active_col = "score" # default
    
    for key, (m_title, m_col) in mapping.items():
        if key.lower() in title_clean.lower():
            modal_title = m_title
            active_col = m_col
            break

    # Add cursor: 'pointer' to the styles
    new_style = style_content
    if "cursor: 'pointer'" not in new_style:
        new_style += ", cursor: 'pointer'"
        
    # Reconstruct the div
    # <div className="kpi-card" style={{ borderTopColor: '#...', cursor: 'pointer' }} onClick={() => openModal('Title', 'col')}>
    replacement = f'<div className="kpi-card" style={{{{{new_style}}}}} onClick={{() => openModal("{modal_title}", "{active_col}")}}>\n                <div className="kpi-title">{title_raw}<'
    
    return replacement

new_content = pattern.sub(replace_func, content)

with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Restored onClick handlers for KPI cards.")
