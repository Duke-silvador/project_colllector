import io
import pandas as pd
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

def create_excel_report(transactions, result):
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        transactions.to_excel(writer, index=False, sheet_name="Transactions")
        result["audit_trail"].to_excel(writer, index=False, sheet_name="Audit Trail")
        summary = pd.DataFrame({
            "Measure": [
                "Standard-rated supplies", "Zero-rated supplies", "Exempt supplies",
                "Output VAT", "Domestic allowable input VAT", "Allowable import VAT",
                "Non-allowable/review input VAT", "Net adjustments", "Total allowable input VAT",
                "Net VAT", "Status"
            ],
            "Amount": [
                result["standard_rated_supplies"], result["zero_rated_supplies"], result["exempt_supplies"],
                result["total_output_vat"], result["domestic_allowable_input_vat"],
                result["allowable_import_vat"], result["non_allowable_input_vat"],
                result["net_adjustments"], result["total_allowable_input_vat"],
                result["net_vat"], result["status"]
            ]
        })
        summary.to_excel(writer, index=False, sheet_name="VAT Summary")
    return output.getvalue()

def create_pdf_report(result):
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4)
    styles = getSampleStyleSheet()
    story = [Paragraph("Zimbabwe Automated VAT Return - Management Summary", styles["Title"]),
             Spacer(1, 12)]
    rows = [
        ["Measure", "Amount"],
        ["Standard-rated supplies", f"${result['standard_rated_supplies']:,.2f}"],
        ["Zero-rated supplies", f"${result['zero_rated_supplies']:,.2f}"],
        ["Exempt supplies", f"${result['exempt_supplies']:,.2f}"],
        ["Output VAT", f"${result['total_output_vat']:,.2f}"],
        ["Allowable input VAT", f"${result['total_allowable_input_vat']:,.2f}"],
        ["Net adjustments", f"${result['net_adjustments']:,.2f}"],
        ["Net VAT", f"${result['net_vat']:,.2f}"],
        ["Status", result["status"]],
    ]
    table = Table(rows, colWidths=[260, 180])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
        ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 15))
    story.append(Paragraph("Educational/management-support report. Verify current ZIMRA requirements before filing.", styles["BodyText"]))
    doc.build(story)
    return output.getvalue()
