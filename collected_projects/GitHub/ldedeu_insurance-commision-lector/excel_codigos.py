"""Conversión compartida de códigos de agencia y celdas Excel."""
from datetime import date, datetime
import re


def normalizar_agency_id(value):
    text = str(value or '').strip()
    match = re.fullmatch(r'(\d+)(?:_(?:FPI|EDI|OVH))?', text, re.I)
    if not match:
        raise ValueError(f'Agencyid no válido: {text!r}; se espera un código numérico con sufijo FPI, EDI u OVH.')
    return match[1].lstrip('0') or '0'


def texto_celda(cell):
    value = cell.value
    if value is None:
        return ''
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, (int, float)) and not isinstance(value, bool) and value == int(value):
        text = str(int(value))
        if re.fullmatch('0+', cell.number_format):
            text = text.zfill(len(cell.number_format))
        return text
    return str(value).strip()
