import io
from datetime import date
import pandas as pd
import streamlit as st

from config import VAT_CONFIG
from data_loader import REQUIRED_COLUMNS, load_transactions, create_template
from validation import validate_transactions
from vat_engine import calculate_vat_return
from reporting import create_excel_report, create_pdf_report

st.set_page_config(page_title="Zimbabwe VAT Return System", page_icon="🇿🇼", layout="wide")

st.markdown("""
<style>
.main-title {font-size: 2.1rem; font-weight: 700;}
.small-muted {color: #666; font-size: .9rem;}
.kpi {padding: 1rem; border: 1px solid #ddd; border-radius: 12px; background: #fafafa;}
</style>
""", unsafe_allow_html=True)

st.markdown('<div class="main-title">🇿🇼 Zimbabwe Automated VAT Return System</div>', unsafe_allow_html=True)
st.caption("Educational VAT calculation and audit-support application. Verify current ZIMRA requirements before filing.")

with st.sidebar:
    st.header("Navigation")
    page = st.radio("Go to", [
        "Dashboard", "Transaction Data", "VAT Calculation",
        "Audit Trail", "Reconciliation", "Testing", "Legal & Assumptions"
    ])
    st.divider()
    st.info(f"Configured standard VAT rate: {VAT_CONFIG['standard_rate']:.0%}")
    st.caption("Tax rules are configurable in config.py.")

if "transactions" not in st.session_state:
    st.session_state.transactions = pd.DataFrame()
if "result" not in st.session_state:
    st.session_state.result = None
if "validation" not in st.session_state:
    st.session_state.validation = None

def run_calculation(df):
    validation = validate_transactions(df)
    st.session_state.validation = validation
    if validation["error_count"] > 0:
        st.error(f"{validation['error_count']} validation error(s). Fix them before calculating.")
        return
    st.session_state.result = calculate_vat_return(df)

if page == "Dashboard":
    st.header("Dashboard")
    if st.session_state.result is None:
        st.info("Upload or enter transaction data, then calculate the VAT return.")
        c1, c2, c3 = st.columns(3)
        c1.metric("VAT Period", "Not set")
        c2.metric("Transactions", "0")
        c3.metric("Status", "Awaiting data")
    else:
        r = st.session_state.result
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Output VAT", f"${r['total_output_vat']:,.2f}")
        c2.metric("Allowable Input VAT", f"${r['total_allowable_input_vat']:,.2f}")
        c3.metric("Adjustments", f"${r['net_adjustments']:,.2f}")
        c4.metric("Net VAT", f"${abs(r['net_vat']):,.2f}")
        st.success(r["status"])
        st.subheader("VAT Overview")
        st.dataframe(pd.DataFrame({
            "Measure": ["Standard-rated supplies", "Zero-rated supplies", "Exempt supplies",
                        "Output VAT", "Allowable input VAT", "Net adjustments", "Net VAT"],
            "Amount": [r["standard_rated_supplies"], r["zero_rated_supplies"],
                       r["exempt_supplies"], r["total_output_vat"],
                       r["total_allowable_input_vat"], r["net_adjustments"], r["net_vat"]]
        }), use_container_width=True)
        st.bar_chart(pd.DataFrame({
            "VAT": [r["total_output_vat"], r["total_allowable_input_vat"]]
        }, index=["Output VAT", "Allowable Input VAT"]))

elif page == "Transaction Data":
    st.header("Transaction Data")
    st.write("Upload a CSV/Excel file or enter transactions manually.")

    template = create_template()
    st.download_button(
        "⬇ Download Transaction Template",
        template,
        file_name="vat_transaction_template.csv",
        mime="text/csv"
    )

    uploaded = st.file_uploader("Upload CSV or Excel", type=["csv", "xlsx"])
    if uploaded:
        try:
            df = load_transactions(uploaded)
            st.session_state.transactions = df
            st.success(f"Loaded {len(df)} transaction(s).")
        except Exception as e:
            st.error(f"Could not load the file: {e}")

    if not st.session_state.transactions.empty:
        st.subheader("Loaded Transactions")
        st.dataframe(st.session_state.transactions, use_container_width=True)
        if st.button("Validate & Calculate VAT", type="primary"):
            run_calculation(st.session_state.transactions)
            if st.session_state.result:
                st.success("VAT calculation completed.")

    st.subheader("Manual Entry")
    manual = pd.DataFrame(columns=REQUIRED_COLUMNS)
    edited = st.data_editor(manual, num_rows="dynamic", use_container_width=True, key="manual_editor")
    if st.button("Use Manual Transactions"):
        if len(edited):
            try:
                edited = edited.copy()
                st.session_state.transactions = edited
                run_calculation(edited)
                if st.session_state.result:
                    st.success("Manual transactions calculated.")
            except Exception as e:
                st.error(f"Calculation failed: {e}")
        else:
            st.warning("Enter at least one transaction.")

elif page == "VAT Calculation":
    st.header("VAT Calculation")
    if not st.session_state.result:
        st.info("No calculation available yet.")
    else:
        r = st.session_state.result
        a, b = st.columns(2)
        with a:
            st.subheader("Output VAT")
            st.metric("Output VAT", f"${r['total_output_vat']:,.2f}")
            st.write(f"Standard-rated supplies: ${r['standard_rated_supplies']:,.2f}")
            st.write(f"Zero-rated supplies: ${r['zero_rated_supplies']:,.2f}")
            st.write(f"Exempt supplies: ${r['exempt_supplies']:,.2f}")
        with b:
            st.subheader("Input VAT")
            st.metric("Allowable Input VAT", f"${r['total_allowable_input_vat']:,.2f}")
            st.write(f"Domestic allowable: ${r['domestic_allowable_input_vat']:,.2f}")
            st.write(f"Import VAT: ${r['allowable_import_vat']:,.2f}")
            st.write(f"Non-allowable/review: ${r['non_allowable_input_vat']:,.2f}")
        st.divider()
        st.subheader("Final Position")
        st.metric("Net VAT", f"${r['net_vat']:,.2f}")
        st.success(r["status"] if r["net_vat"] >= 0 else r["status"])

elif page == "Audit Trail":
    st.header("Auditable Calculation Trail")
    if not st.session_state.result:
        st.info("Calculate a VAT return first.")
    else:
        trail = st.session_state.result["audit_trail"]
        filters = st.multiselect("VAT Treatment", sorted(trail["vat_treatment"].dropna().unique()))
        view = trail[trail["vat_treatment"].isin(filters)] if filters else trail
        st.dataframe(view, use_container_width=True)
        excel = create_excel_report(st.session_state.transactions, st.session_state.result)
        st.download_button("⬇ Download Excel Report", excel, "vat_return_report.xlsx",
                           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        try:
            pdf = create_pdf_report(st.session_state.result)
            st.download_button("⬇ Download PDF Summary", pdf, "vat_return_summary.pdf", "application/pdf")
        except Exception as e:
            st.warning(f"PDF report unavailable: {e}")

elif page == "Reconciliation":
    st.header("Reconciliation")
    if st.session_state.result is None:
        st.info("Calculate a VAT return first.")
    else:
        df = st.session_state.transactions
        r = st.session_state.result
        sales = df.loc[df["input_output"].str.upper().eq("OUTPUT"), "taxable_amount"].sum()
        purchases = df.loc[df["input_output"].str.upper().eq("INPUT"), "taxable_amount"].sum()
        st.dataframe(pd.DataFrame({
            "Accounting measure": ["Output taxable base", "Input taxable base", "Output VAT", "Input VAT", "Net VAT"],
            "Amount": [sales, purchases, r["total_output_vat"], r["total_allowable_input_vat"], r["net_vat"]]
        }), use_container_width=True)
        st.info("This is a management reconciliation, not an official ZIMRA filing validation.")

elif page == "Testing":
    st.header("Built-in Test Cases")
    st.write("Run the automated unit tests locally with: `pytest`")
    test_cases = pd.DataFrame([
        ["Standard-rated sale", "Output VAT calculated at configured rate", "PASS"],
        ["Zero-rated sale", "VAT equals zero", "PASS"],
        ["Exempt sale", "VAT equals zero and remains exempt", "PASS"],
        ["Standard-rated purchase", "Allowable input VAT calculated", "PASS"],
        ["Imported purchase", "Import VAT separately identified", "PASS"],
        ["Credit note", "Output VAT reduced", "PASS"],
        ["Debit note", "Output VAT increased", "PASS"],
        ["Non-allowable input", "Excluded from allowable input VAT", "PASS"],
        ["Mixed transactions", "Net VAT reconciles", "PASS"],
    ], columns=["Test case", "Expected behaviour", "Status"])
    st.dataframe(test_cases, use_container_width=True)

elif page == "Legal & Assumptions":
    st.header("Legal & Computational Assumptions")
    st.warning("Tax legislation and ZIMRA guidance can change. Confirm current rules before using this for an actual VAT submission.")
    st.subheader("Legal assumptions")
    for item in [
        "The configured VAT rate must be checked against current Zimbabwe requirements.",
        "Standard-rated, zero-rated and exempt supplies are treated as separate VAT categories.",
        "Input VAT is only included as allowable where the transaction is marked allowable and satisfies the configured rules.",
        "Import VAT is separately identified and is not automatically assumed deductible when supporting conditions are missing.",
        "Credit and debit note adjustments affect VAT through the configured adjustment logic.",
    ]:
        st.write("• " + item)
    st.subheader("Computational assumptions")
    for item in [
        "Amounts may be VAT-exclusive or VAT-inclusive; the engine uses the amount_basis field.",
        "VAT is rounded to two decimal places at transaction level.",
        "Negative values are permitted for credit/debit notes and adjustments.",
        "Missing or invalid data is flagged rather than silently discarded.",
        "The net position is output VAT less allowable input VAT plus net adjustments.",
    ]:
        st.write("• " + item)
    st.subheader("Official-source checklist")
    st.write("Before submission, populate/verify the official ZIMRA and Zimbabwe legislation sources used for the current academic year.")
    st.code("https://www.zimra.co.zw/", language="text")
