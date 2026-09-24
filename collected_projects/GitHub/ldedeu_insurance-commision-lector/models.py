"""Modelos de datos para las tablas existentes; no crean ni modifican el esquema."""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import ClassVar


@dataclass(kw_only=True)
class StCommonwealthRaw:
    """Registro de staging_hub.st_commonwealth_raw.

    Los tipos representan valores Python, no una declaracion DDL. El INSERT
    proporcionado no especifica longitudes, nulabilidad ni AUTO_INCREMENT.
    id=None permite que MySQL lo genere tras verificar AUTO_INCREMENT.
    effective_date admite el texto del archivo.
    created_at=None solicita CURRENT_TIMESTAMP al insertar.
    """

    table_name: ClassVar[str] = "staging_hub.st_commonwealth_raw"

    id: int | None
    file_id: str
    file_name: str
    accounting_month: str | date
    insured_name: str
    policy_number: str
    effective_date: str | date | None
    roadside_flag: str
    premium_amount: Decimal | None
    comm_percent: Decimal
    commission_amount: Decimal
    producer_code: str
    producer_name: str
    policy_status: str | None = None
    office_id: str | None = None
    line_business_id: str | None = None
    term_length: int | None = None
    compass_policy_id: str | None = None
    policy_effective_date: date | None = None
    transaction_type: str | None = None
    franchise_number: str | None = None
    del_toro_percent: Decimal | None = None
    del_toro_commission: Decimal | None = None
    franchise_percent: Decimal | None = None
    franchise_commission: Decimal | None = None
    created_at: datetime | None = None

    def __post_init__(self):
        for field in ("premium_amount", "comm_percent", "commission_amount"):
            value = getattr(self, field)
            if field == 'premium_amount' and value is None:
                continue
            if not isinstance(value, Decimal) or not value.is_finite():
                raise ValueError(f"{field} debe ser un Decimal finito.")


@dataclass(kw_only=True)
class CommissionRate:
    """Registro vigente de staging_hub.commission_rates.

    Una fila por combinacion unica de state, carrier, transaction_type,
    business_line (linea de negocio, ej. R, MC, CV; ver
    config/business_lines.json). business_line="" (cadena vacia) representa
    una comision general, sin linea de negocio especifica. franchise_percent
    es lo que recibe el franchise; del_toro_percent es lo que recibe Del
    Toro del carrier. El margen (del_toro_percent menos franchise_percent)
    no se guarda; se calcula al mostrarlo. id=None permite que MySQL lo
    genere tras verificar AUTO_INCREMENT.
    """

    table_name: ClassVar[str] = "staging_hub.commission_rates"

    id: int | None
    state: str
    carrier: str
    transaction_type: str
    business_line: str
    franchise_percent: Decimal
    del_toro_percent: Decimal
    updated_by: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def __post_init__(self):
        for field in ("franchise_percent", "del_toro_percent"):
            value = getattr(self, field)
            if not isinstance(value, Decimal) or not value.is_finite() or value < 0:
                raise ValueError(f"{field} debe ser un Decimal finito no negativo.")
        from tipos_transaccion import cargar_tipos_transaccion
        if self.transaction_type not in dict(cargar_tipos_transaccion()):
            raise ValueError("El tipo de transacción no está registrado en el catálogo.")
        if not self.updated_by.strip():
            raise ValueError("updated_by no puede estar vacio.")


@dataclass(kw_only=True)
class CommissionRateHistory:
    """Registro append-only de staging_hub.commission_rate_history.

    previous_franchise_percent y previous_del_toro_percent son None solo en
    la fila que documenta la creacion de la comision; toda edicion
    posterior los completa.
    """

    table_name: ClassVar[str] = "staging_hub.commission_rate_history"

    id: int | None
    rate_id: int
    state: str
    carrier: str
    transaction_type: str
    business_line: str
    previous_franchise_percent: Decimal | None
    new_franchise_percent: Decimal
    previous_del_toro_percent: Decimal | None
    new_del_toro_percent: Decimal
    changed_by: str
    changed_at: datetime | None = None

    def __post_init__(self):
        for field in ("new_franchise_percent", "new_del_toro_percent"):
            value = getattr(self, field)
            if not isinstance(value, Decimal) or not value.is_finite() or value < 0:
                raise ValueError(f"{field} debe ser un Decimal finito no negativo.")
        for field in ("previous_franchise_percent", "previous_del_toro_percent"):
            value = getattr(self, field)
            if value is not None and (not isinstance(value, Decimal) or not value.is_finite()):
                raise ValueError(f"{field} debe ser un Decimal finito o None.")
        if not self.changed_by.strip():
            raise ValueError("changed_by no puede estar vacio.")


@dataclass(kw_only=True)
class Office:
    """Registro de staging_hub.offices.

    office_id es el identificador que asigna Agency Compass a la oficina
    (unico en la tabla); id es la llave propia de esta tabla, igual que
    codeID en franchises_carrier_codes. Los campos booleanos siempre tienen
    valor (nunca None). uploaded_at=None solicita CURRENT_TIMESTAMP al
    insertar.
    """

    table_name: ClassVar[str] = "staging_hub.offices"

    id: int | None
    office_id: str
    office_number: str | None
    office_name: str
    status: str | None
    office_type: str | None
    is_corporate_hq: bool
    phone_number: str | None
    email: str | None
    street_address: str | None
    city: str | None
    state: str | None
    zip: str | None
    monthly_sales_goal: Decimal | None
    active_users: int | None
    total_users: int | None
    shared_email_account: bool
    sms_upload_enabled: bool
    qq_credential: str | None
    created_date: datetime | date | None
    uploaded_at: datetime | None = None

    def __post_init__(self):
        if not self.office_id.strip():
            raise ValueError("office_id no puede estar vacio.")
        if not self.office_name.strip():
            raise ValueError("office_name no puede estar vacio.")
        if self.monthly_sales_goal is not None and (
            not isinstance(self.monthly_sales_goal, Decimal) or not self.monthly_sales_goal.is_finite()
        ):
            raise ValueError("monthly_sales_goal debe ser un Decimal finito o None.")
