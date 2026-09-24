"""Parser del Agency Commission Report de Commonwealth."""
import re
from datetime import datetime
from decimal import Decimal
from calculos import calcular_porcentajes

MONEY = r"-?\$?[\d,]+\.\d{2}"
ROW = re.compile(rf"^(?P<name>.+?)\s+(?P<policy>[A-Z0-9-]+\d[A-Z0-9-]*)\s+(?:.*?)?(?P<date>\d{{2}}/\d{{2}}/\d{{4}})\s+(?P<road>[YN])\s+(?P<premium>{MONEY})\s+(?P<commission>{MONEY})$", re.I)


def amount(value):
    return Decimal(value.replace(",", "").replace("$", ""))


def procesar_commonwealth(text, month):
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
        raise ValueError("Indica el mes contable en formato YYYY-MM en el input de la interfaz.")
    period = re.search(r"(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})", text)
    agency = re.search(r"Agency Code\s*:?\s*([A-Z0-9-]+)", text, re.I)
    if not period or not agency:
        raise ValueError("No se reconoce el período o Agency Code del reporte. Se necesita el PDF original para ajustar la lectura.")
    rows, errors = [], []
    location = None
    subtotal = Decimal(0)
    open_section = False
    in_chargebacks = False
    charges = Decimal(0)
    charge_total = None
    grand_total = None
    for raw in text.splitlines():
        line = " ".join(raw.split())
        if not line:
            continue
        if re.fullmatch(r"Chargebacks\s*:?", line, re.I):
            in_chargebacks = True
            continue
        charge_summary = re.match(rf"Chargeback Total\s+({MONEY})$", line, re.I)
        if charge_summary:
            charge_total = amount(charge_summary[1])
            in_chargebacks = False
            continue
        grand = re.match(rf"Grand Total\s+.+?\s+({MONEY})$", line, re.I)
        if grand:
            grand_total = amount(grand[1])
            in_chargebacks = False
            continue
        if in_chargebacks:
            charge = re.match(rf"(.+?)\s+({MONEY})$", line)
            if charge:
                value = amount(charge[2])
                charges += value
                rows.append(dict(accounting_month=month, insured_name='', transaction_type=charge[1],
                    policy_number='', effective_date='', roadside_flag='',
                    premium_amount='', comm_percent='1', commission_amount=str(value),
                    producer_code='', producer_name='',
                    _chargeback=True))
            elif not re.match(r"(?:Page\s+\d+|AGENCY COMMISSION REPORT|\d{2}/\d{2}/\d{4}\s*-)", line, re.I):
                errors.append("No se pudo leer una línea de Chargebacks; revisa el texto extraído.")
            continue
        loc = re.match(r"Location\s*:?\s+(.+)$", line, re.I)
        if loc:
            if open_section and loc[1] != location:
                errors.append("Falta el subtotal de una ubicación.")
            location = loc[1]
            continue
        total = re.match(rf"TOTAL\s+(.+?)\s+({MONEY})$", line, re.I)
        if total:
            if total[1].casefold() != (location or "").casefold() or amount(total[2]) != subtotal:
                errors.append("El subtotal de una ubicación no coincide con los registros extraídos.")
            subtotal = Decimal(0)
            open_section = False
            continue
        match = ROW.match(line)
        if match:
            if not location:
                errors.append("Se encontró un registro sin Location.")
                continue
            premium, commission = amount(match['premium']), amount(match['commission'])
            if not premium and commission:
                errors.append("Hay una comisión con prima cero; revisa el porcentaje.")
            rows.append(dict(accounting_month=month, insured_name=match['name'],
                policy_number=match['policy'], effective_date=datetime.strptime(match['date'], "%m/%d/%Y").date().isoformat(),
                roadside_flag=match['road'].upper(), premium_amount=str(premium),
                comm_percent='0', commission_amount=str(commission),
                producer_code=agency[1], producer_name=location))
            subtotal += commission
            open_section = True
        elif re.search(r"\d{2}/\d{2}/\d{4}", line) and not re.search(r"\d{2}/\d{2}/\d{4}\s*-", line):
            errors.append("Hay una línea con fecha que no se pudo convertir en registro.")
    if open_section:
        errors.append("Falta el subtotal final de la ubicación.")
    if charge_total is not None and charges != charge_total:
        errors.append("Los chargebacks extraídos no coinciden con Chargeback Total.")
    if grand_total is not None and sum((amount(row['commission_amount']) for row in rows), Decimal(0)) != grand_total:
        errors.append("Las comisiones y chargebacks no coinciden con Grand Total.")
    if not rows:
        errors.append("No se encontraron registros. Un PDF escaneado requiere OCR.")
    if errors:
        raise ValueError(" ".join(dict.fromkeys(errors)))
    return calcular_porcentajes(rows)
