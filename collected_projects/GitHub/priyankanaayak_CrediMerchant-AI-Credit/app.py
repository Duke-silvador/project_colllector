import pandas as pd
import numpy as np
import plotly.graph_objects as go
import streamlit as st
import engine as E

st.set_page_config(page_title="CrediMerchant AI | Fair Credit Assessment", page_icon="💳", layout="wide")
E.init_db()

BAND_COLOR = {"Low risk": "#16A34A", "Medium risk": "#D97706", "High risk": "#DC2626"}

# Comprehensive CSS Override for Light Mode & High Contrast Dropdown Menus
st.markdown("""
<style>
    /* Force Light Mode Core Backgrounds */
    .stApp, [data-testid="stAppViewContainer"], [data-testid="stHeader"] {
        background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 40%, #DBEAFE 100%) !important;
        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
    }

    /* Force Dark High-Contrast Text Everywhere Across Page Text */
    html, body, [class*="css"], .stMarkdown, p, div, label, span, li, dt, dd {
        color: #0F172A !important;
        font-weight: 500;
    }

    h1, h2, h3, h4, h5, h6 {
        color: #1E3A8A !important;
        font-weight: 800 !important;
        letter-spacing: -0.5px;
    }

    /* Hero Banner Container */
    .hero-banner-container {
        background: linear-gradient(120deg, #FFFFFF 0%, #EFF6FF 60%, #DBEAFE 100%);
        border: 2px solid #3B82F6;
        border-radius: 24px;
        padding: 32px 40px;
        margin-bottom: 30px;
        box-shadow: 0 15px 35px rgba(37, 99, 235, 0.12);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .hero-text-title {
        color: #1E3A8A !important;
        font-size: 2.4rem !important;
        font-weight: 900 !important;
        margin: 0 0 8px 0 !important;
    }

    .hero-text-subtitle {
        color: #2563EB !important;
        font-size: 1.15rem !important;
        font-weight: 600 !important;
        margin: 0 !important;
    }

    /* Cards & Containers */
    div[data-testid="stForm"], div.stMarkdownContainer > div.fun-card, div[data-testid="stMetricValue"] {
        background: rgba(255, 255, 255, 0.95) !important;
        border-radius: 20px !important;
        border: 1.5px solid #BFDBFE !important;
        box-shadow: 0 10px 25px rgba(30, 58, 138, 0.08) !important;
        padding: 24px !important;
    }

    /* Inputs */
    input, select, textarea, div[data-baseweb="input"], div[data-baseweb="select"] {
        color: #0F172A !important;
        font-weight: 600 !important;
        background-color: #FFFFFF !important;
        border-radius: 12px !important;
    }

    /* ========================================================================== */
    /* COMPLETE BASEWEB PORTAL & SELECTBOX DROPDOWN OVERRIDE (FIXES DARK MENU)  */
    /* ========================================================================== */
    div[data-baseweb="popover"],
    div[data-baseweb="menu"],
    ul[data-baseweb="menu"],
    ul[role="listbox"],
    div[role="listbox"],
    [data-baseweb="popover"] > div,
    [data-baseweb="menu"] > div {
        background-color: #FFFFFF !important;
        background: #FFFFFF !important;
        border: 2px solid #3B82F6 !important;
        border-radius: 12px !important;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18) !important;
    }

    /* Dropdown Individual Items */
    li[data-baseweb="option"],
    div[data-baseweb="option"],
    li[role="option"],
    div[role="option"],
    ul[role="listbox"] li,
    ul[data-baseweb="menu"] li {
        background-color: #FFFFFF !important;
        background: #FFFFFF !important;
        color: #0F172A !important;
        font-weight: 700 !important;
        font-size: 1rem !important;
        padding: 12px 16px !important;
    }

    /* Dropdown Item Hover & Active Selection States */
    li[data-baseweb="option"]:hover,
    div[data-baseweb="option"]:hover,
    li[role="option"]:hover,
    div[role="option"]:hover,
    li[aria-selected="true"],
    div[aria-selected="true"] {
        background-color: #EFF6FF !important;
        background: #EFF6FF !important;
        color: #2563EB !important;
    }

    /* Dropdown text inside elements */
    li[data-baseweb="option"] *,
    div[data-baseweb="option"] *,
    li[role="option"] * {
        color: #0F172A !important;
        fill: #0F172A !important;
    }

    li[data-baseweb="option"]:hover *,
    div[data-baseweb="option"]:hover *,
    li[role="option"]:hover * {
        color: #2563EB !important;
        fill: #2563EB !important;
    }

    /* Expander Header styling */
    div[data-testid="stExpander"], details summary {
        background-color: #FFFFFF !important;
        color: #1E3A8A !important;
        border: 1.5px solid #BFDBFE !important;
        border-radius: 12px !important;
    }

    /* Primary Action Buttons */
    .stButton>button {
        background: linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%) !important;
        color: #FFFFFF !important;
        border-radius: 14px !important;
        font-weight: 700 !important;
        font-size: 1rem !important;
        border: none !important;
        padding: 0.75rem 1.8rem !important;
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35) !important;
        transition: all 0.2s ease-in-out !important;
    }

    .stButton>button:hover {
        transform: translateY(-3px) scale(1.01) !important;
        box-shadow: 0 10px 25px rgba(37, 99, 235, 0.5) !important;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%) !important;
        border-right: 2px solid #BFDBFE !important;
    }
</style>
""", unsafe_allow_html=True)

st.markdown("""
<div class="hero-banner-container">
    <div>
        <h1 class="hero-text-title">CrediMerchant Assessment AI</h1>
        <p class="hero-text-subtitle">Empowering Local Shopkeepers with Fair, Transparent & Responsible Underwriting</p>
    </div>
</div>
""", unsafe_allow_html=True)

st.sidebar.title("💳 Navigation Menu")
page = st.sidebar.radio("Underwriting Steps:", [
    "1. Merchant & Consent",
    "2. Upload Financial Data",
    "3. Cash-Flow Analysis",
    "4. Risk Assessment",
    "5. Lender Report",
])

st.sidebar.markdown("---")
st.sidebar.caption("🔒 **DPDP Compliant**: Uses only consented merchant data. A human lender makes final credit decisions.")

def pick_merchant():
    rows = E.q("SELECT id, business_name, owner_name FROM merchants ORDER BY id DESC")
    if not rows:
        st.info("No merchants registered yet. Please start at **1. Merchant & Consent**.")
        st.stop()
    ids = [r["id"] for r in rows]
    labels = {r["id"]: f"#{r['id']} {r['business_name']} ({r['owner_name']})" for r in rows}
    default = ids.index(st.session_state["mid"]) if st.session_state.get("mid") in ids else 0
    mid = st.selectbox("Select Active Merchant Profile:", ids, index=default, format_func=lambda i: labels[i])
    st.session_state["mid"] = mid
    return E.get_merchant(mid)

def need_transactions(m):
    tx = E.load_transactions(m["id"])
    if tx.empty:
        st.warning("This merchant has no financial data uploaded yet. Please proceed to **2. Upload Financial Data**.")
        st.stop()
    return tx

# ------------------------------------------------------------------------------
# PAGE 1: MERCHANT & CONSENT
# ------------------------------------------------------------------------------
if page.startswith("1"):
    st.title("Step 1: Merchant Registration & Privacy Consent")
    st.write("Record business details and verifiable data authorization. No national identity numbers are collected.")

    with st.form("merchant_form"):
        c1, c2 = st.columns(2)
        business_name = c1.text_input("Business / Shop Name *", value="Ratnadeep")
        owner_name = c2.text_input("Owner Name *", value="Neha Nayak")
        business_type = c1.selectbox("Business Category", [
            "Kirana / Grocery", "Clothing / Garments", "Electronics / Mobile",
            "Restaurant / Food stall", "Pharmacy", "Services", "Other"
        ])
        city = c2.text_input("City / Town", value="Hyderabad")
        years = c1.number_input("Years in Business", min_value=0.0, max_value=80.0, value=4.5, step=0.5)
        amount = c2.number_input("Requested Credit Line (Rs.)", min_value=5000.0, value=150000.0, step=5000.0)
        tenure = c1.slider("Requested Tenure (Months)", 6, 36, 12)
        rate = c2.number_input("Proposed Interest Rate (% per annum)", min_value=0.0, max_value=60.0, value=16.5, step=0.5)

        st.markdown("<h4 style='color: #1E3A8A;'>Data Privacy & Authorization Checkbox</h4>", unsafe_allow_html=True)
        k1 = st.checkbox("I authorize analysis of my aggregated UPI, POS, and sales transaction data.", value=True)
        k2 = st.checkbox("I consent to sharing the explainable credit assessment report with regulated lenders.", value=True)
        k3 = st.checkbox("I understand my data is protected under DPDP regulations and can request deletion anytime.", value=True)

        submitted = st.form_submit_button("Save Merchant Profile 🚀")
        if submitted:
            if not business_name.strip() or not owner_name.strip():
                st.error("Please fill in both business name and owner name.")
            elif not (k1 and k2 and k3):
                st.error("Explicit consent is required for all three privacy checkboxes.")
            else:
                mid = E.save_merchant({
                    "business_name": business_name.strip(), "owner_name": owner_name.strip(),
                    "business_type": business_type, "city": city.strip(),
                    "years_in_business": years, "requested_amount": amount,
                    "tenure_months": tenure, "interest_rate": rate
                })
                st.session_state["mid"] = mid
                st.success(f"Successfully saved Merchant Profile #{mid} with cryptographically logged consent!")
                st.divider()
                st.info("Next Step: Proceed to **2. Upload Financial Data** in the navigation menu.")

    st.subheader("Registered Merchant Registry")
    rows = E.q("SELECT id, business_name, owner_name, business_type, city, requested_amount, tenure_months, consent_at FROM merchants ORDER BY id DESC")
    if rows:
        st.dataframe(pd.DataFrame([dict(r) for r in rows]), hide_index=True)
        with st.expander("Privacy Control - Delete Merchant Record"):
            ids = [r["id"] for r in rows]
            del_id = st.selectbox("Select Merchant to Delete", ids, key="del_id")
            sure = st.checkbox("Permanently delete this merchant and all associated ledger records.")
            if st.button("Delete Permanently") and sure:
                E.delete_merchant(del_id)
                st.session_state.pop("mid", None)
                st.success("Merchant data deleted. Refreshing list...")

# ------------------------------------------------------------------------------
# PAGE 2: UPLOAD FINANCIAL DATA
# ------------------------------------------------------------------------------
elif page.startswith("2"):
    st.title("Step 2: Cash-Flow Data Ingestion")
    m = pick_merchant()
    st.write("Upload bank statements, UPI merchant transaction exports, or cash register registers.")

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Option A: Upload Custom Transaction CSV")
        up = st.file_uploader("Upload Statement File (.csv)", type=["csv"])
        if up is not None:
            try:
                df, dropped = E.clean_upload(pd.read_csv(up))
                if df.empty:
                    st.error("No valid transaction rows found. Verify 'date' and 'amount' columns.")
                else:
                    st.success(f"Parsed {len(df)} valid records ({dropped} invalid rows filtered).")
                    st.dataframe(df.head(10), hide_index=True)
                    if st.button("Save Uploaded Data"):
                        E.save_transactions(m["id"], df)
                        st.success("Data successfully stored! Move to **3. Cash-Flow Analysis**.")
            except Exception as err:
                st.error(f"Error parsing file: {err}")

    with c2:
        st.subheader("Option B: Load Synthetic Demo Dataset")
        st.caption("Includes 18 months of realistic small Kirana shop transactions with festival seasonality peaks.")
        demo = E.generate_demo_data()
        if st.button("Load Kirana Store Demo Data"):
            E.save_transactions(m["id"], demo)
            st.success("Loaded 18-month transaction history! Proceed to **3. Cash-Flow Analysis**.")
        
        demo_csv = demo.assign(date=demo["date"].dt.strftime("%Y-%m-%d")).to_csv(index=False)
        st.download_button("Download Sample CSV Format", demo_csv, file_name="sample_transactions.csv", mime="text/csv")

    existing = E.load_transactions(m["id"])
    if not existing.empty:
        st.info(f"Currently stored: **{len(existing)} transactions** spanning from {existing['date'].min():%d %b %Y} to {existing['date'].max():%d %b %Y}.")

# ------------------------------------------------------------------------------
# PAGE 3: CASH-FLOW ANALYSIS
# ------------------------------------------------------------------------------
elif page.startswith("3"):
    st.title("Step 3: Interactive Cash-Flow & Seasonality Analytics")
    m = pick_merchant()
    tx = need_transactions(m)
    monthly = E.monthly_summary(tx)

    c = st.columns(4)
    c[0].metric("Observed History", f"{len(monthly)} Months")
    c[1].metric("Avg Inflow / Month", E.money(monthly["inflow"].mean()))
    c[2].metric("Avg Outflow / Month", E.money(monthly["outflow"].mean()))
    c[3].metric("Avg Net Surplus", E.money(monthly["net"].mean()))

    fig = go.Figure()
    fig.add_bar(x=monthly["label"], y=monthly["inflow"], name="Inflow (Sales)", marker_color="#2563EB")
    fig.add_bar(x=monthly["label"], y=monthly["outflow"], name="Outflow (Expenses)", marker_color="#EF4444")
    fig.add_scatter(x=monthly["label"], y=monthly["net"], name="Net Cash Surplus", mode="lines+markers", line=dict(color="#10B981", width=3.5))
    fig.update_layout(barmode="group", title="Monthly Revenue vs Expense Dynamics", yaxis_title="Rs.", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.8)")
    st.plotly_chart(fig, use_container_width=True)

    c1, c2 = st.columns(2)
    with c1:
        x = np.arange(len(monthly))
        slope, intercept = np.polyfit(x, monthly["inflow"], 1) if len(monthly) >= 2 else (0, 0)
        tf = go.Figure()
        tf.add_scatter(x=monthly["label"], y=monthly["inflow"], mode="lines+markers", name="Sales Volume")
        tf.add_scatter(x=monthly["label"], y=slope * x + intercept, mode="lines", name="Linear Trend", line=dict(dash="dash", color="#8B5CF6"))
        tf.update_layout(title="Sales Growth Trajectory", yaxis_title="Rs.", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.8)")
        st.plotly_chart(tf, use_container_width=True)

    with c2:
        seas = E.seasonality_table(monthly)
        if seas is None:
            st.info("Seasonality analysis requires at least 12 full calendar months.")
        else:
            colors_ = ["#F59E0B" if v >= 1.2 else "#3B82F6" if v >= 0.9 else "#6B7280" for v in seas["index"]]
            sf = go.Figure(go.Bar(x=seas["month"], y=seas["index"], marker_color=colors_))
            sf.add_hline(y=1.0, line_dash="dash", annotation_text="Baseline Average (1.0x)")
            sf.update_layout(title="Seasonality Index per Calendar Month", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.8)")
            st.plotly_chart(sf, use_container_width=True)

# ------------------------------------------------------------------------------
# PAGE 4: RISK ASSESSMENT
# ------------------------------------------------------------------------------
elif page.startswith("4"):
    st.title("Step 4: Explainable Responsible Scorecard")
    m = pick_merchant()
    tx = need_transactions(m)
    if not (m["consent_data"] and m["consent_share"] and m["consent_privacy"]):
        st.error("Consent verification failed. Underwriting blocked.")
        st.stop()

    monthly = E.monthly_summary(tx)
    try:
        a = E.assess(m, monthly)
    except ValueError as err:
        st.warning(str(err))
        st.stop()

    col = BAND_COLOR[a["band"]]
    
    g1, g2 = st.columns([1, 2])
    with g1:
        score_val = a["score"]
        gauge_svg = f"""
        <div style="text-align: center; background: white; border-radius: 20px; padding: 20px; border: 2px solid #BFDBFE;">
            <svg width="200" height="130" viewBox="0 0 200 130">
                <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="#E2E8F0" stroke-width="20" stroke-linecap="round"/>
                <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="{col}" stroke-width="20" stroke-linecap="round"
                      stroke-dasharray="{score_val * 2.51} 251"/>
                <circle cx="100" cy="110" r="10" fill="#1E3A8A"/>
                <text x="100" y="85" font-size="28" font-weight="900" text-anchor="middle" fill="#0F172A">{score_val}</text>
                <text x="100" y="102" font-size="12" font-weight="700" text-anchor="middle" fill="#64748B">OUT OF 100</text>
            </svg>
            <div style="font-size: 1.3rem; font-weight: 800; color: {col}; margin-top: 5px;">{a['band']}</div>
        </div>
        """
        st.markdown(gauge_svg, unsafe_allow_html=True)

    with g2:
        st.subheader("Repayment Capacity & Safety Buffer")
        r = st.columns(3)
        r[0].metric("Requested EMI", E.money(a["requested_emi"]))
        r[1].metric("Cautious-Month Surplus", E.money(a["conservative_surplus"]))
        r[2].metric("DSCR Coverage", f"{a['dscr']:.2f}x")

        r2 = st.columns(2)
        r2[0].metric("Affordable EMI (50% Buffer)", E.money(a["affordable_emi"]))
        r2[1].metric("Recommended Max Credit", E.money(a["max_affordable_loan"]))

    st.subheader("Transparent Factor Breakdown (Explainable Rules)")
    fdf = pd.DataFrame(a["factors"])
    bar = go.Figure()
    bar.add_bar(y=fdf["name"], x=fdf["max"], orientation="h", name="Max Possible", marker_color="#E2E8F0")
    bar.add_bar(y=fdf["name"], x=fdf["points"], orientation="h", name="Points Earned", marker_color=col)
    bar.update_layout(barmode="overlay", yaxis_autorange="reversed", height=280, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(255,255,255,0.8)")
    st.plotly_chart(bar, use_container_width=True)

    for f in a["factors"]:
        st.markdown(f"**• {f['name']}** ({f['points']}/{f['max']} pts): {f['detail']}")

    st.info(f"ℹ️ **Seasonality Insight**: {a['seasonal_note']}")
    st.success(f"💡 **Underwriter Recommendation**: {a['recommendation']}")

    if st.button("Save Assessment to Database 💾"):
        E.save_assessment(m["id"], a)
        st.success("Assessment record successfully committed to SQLite database!")

# ------------------------------------------------------------------------------
# PAGE 5: LENDER REPORT & PDF EXPORT
# ------------------------------------------------------------------------------
else:
    st.title("Step 5: Lender Decision & Formal Audit Export")
    m = pick_merchant()
    row = E.latest_assessment(m["id"])
    if row is None:
        st.warning("No saved assessment found. Go to **4. Risk Assessment** and save an assessment first.")
        st.stop()

    a = row["result"]
    st.markdown(f"### {m['business_name']} — Score **{a['score']}/100** (<span style='color:{BAND_COLOR[a['band']]}'>{a['band']}</span>)", unsafe_allow_html=True)
    st.caption(f"Created: {row['created_at']} | History: {a['period']} | Consent Logged: {m['consent_at']}")

    st.subheader("Record Lender Decision")
    with st.form("decision_form"):
        decision = st.radio("Underwriting Action", [
            "Approve as requested",
            "Approve with changes (smaller amount / different schedule)",
            "Request more information",
            "Decline"
        ])
        notes = st.text_area("Underwriter Rationale & Stipulations")
        go_save = st.form_submit_button("Submit Underwriting Decision")

        if go_save:
            if decision == "Decline" and not notes.strip():
                st.error("Declining an application requires documented notes explaining the rationale.")
            else:
                E.save_decision(row["id"], decision, notes.strip())
                st.success("Lender decision logged.")

    row = E.latest_assessment(m["id"])
    if row.get("decision"):
        st.info(f"Recorded Decision: **{row['decision']}** ({row['decided_at']})\nNotes: {row['decision_notes'] or '-'}")

    pdf_bytes = E.build_pdf(m, row)
    st.download_button("Download Official PDF Assessment Report 📥", pdf_bytes, file_name=f"credit_report_{m['id']}_{m['business_name'].replace(' ', '_')}.pdf", mime="application/pdf")
