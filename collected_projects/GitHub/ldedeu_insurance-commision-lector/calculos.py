"""Reglas de comision compartidas por vista previa e importacion."""
from decimal import Decimal, InvalidOperation
from datetime import date
from calendar import monthrange


def calcular_term_length(effective_date, expiration_date):
    """Meses calendario completos de vigencia; fechas ausentes/invalidas -> None."""
    try:
        start = date.fromisoformat(str(effective_date)[:10])
        end = date.fromisoformat(str(expiration_date)[:10])
    except (ValueError, TypeError):
        return None
    if end < start:
        return None
    months = (end.year - start.year) * 12 + end.month - start.month
    anniversary_day = min(start.day, monthrange(end.year, end.month)[1])
    return months - (end.day < anniversary_day)


def calcular_porcentajes(rows):
    result = []
    for index, source in enumerate(rows, 1):
        row = dict(source)
        try:
            premium = Decimal(0) if row.get('_chargeback') else Decimal(str(row.get('premium_amount', '')))
            commission = Decimal(str(row.get('commission_amount', '')))
            if not premium.is_finite() or not commission.is_finite():
                raise InvalidOperation
        except InvalidOperation:
            raise ValueError(f"Registro {index}: prima y comision deben ser numeros finitos.") from None
        if row.get('_chargeback'):
            percent = Decimal(1)
        elif premium:
            percent = commission / premium
        elif commission:
            raise ValueError(f"Registro {index}: no se puede dividir una comision entre prima cero.")
        else:
            percent = Decimal(0)
        row['comm_percent'] = str(percent)
        result.append(row)
    return result
