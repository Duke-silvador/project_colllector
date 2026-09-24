"""Persistencia de modelos usando la conexion de database.conectar()."""

from models import StCommonwealthRaw, CommissionRate, CommissionRateHistory, Office


class StCommonwealthRawRepository:
    def __init__(self, connection):
        self.connection = connection

    def insertar(self, registro: StCommonwealthRaw) -> None:
        """Inserta un registro; el llamador controla commit/rollback y conexion."""
        sql = """
            INSERT INTO staging_hub.st_commonwealth_raw
                (id, file_id, file_name, accounting_month, insured_name,
                 policy_number, effective_date, roadside_flag, premium_amount,
                 comm_percent, commission_amount, producer_code, producer_name,
                 compass_policy_id, policy_effective_date, term_length, line_business_id, office_id, policy_status, transaction_type, franchise_number, del_toro_percent,
                 del_toro_commission, franchise_percent, franchise_commission, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, CURRENT_TIMESTAMP))
        """
        values = (
            registro.id,
            registro.file_id,
            registro.file_name,
            registro.accounting_month,
            registro.insured_name,
            registro.policy_number,
            registro.effective_date,
            registro.roadside_flag,
            registro.premium_amount,
            registro.comm_percent,
            registro.commission_amount,
            registro.producer_code,
            registro.producer_name,
            registro.compass_policy_id,
            registro.policy_effective_date,
            registro.term_length,
            registro.line_business_id,
            registro.office_id,
            registro.policy_status,
            registro.transaction_type,
            registro.franchise_number,
            registro.del_toro_percent,
            registro.del_toro_commission,
            registro.franchise_percent,
            registro.franchise_commission,
            registro.created_at,
        )
        if registro.id is None:
            sql = sql.replace("(id, file_id,", "(file_id,").replace("VALUES (%s, %s,", "VALUES (%s,", 1)
            values = values[1:]
        cursor = self.connection.cursor()
        try:
            cursor.execute(sql, values)
        finally:
            cursor.close()


OFFICE_COLUMNS = (
    "office_id", "office_number", "office_name", "status", "office_type", "is_corporate_hq",
    "phone_number", "email", "street_address", "city", "state", "zip", "monthly_sales_goal",
    "active_users", "total_users", "shared_email_account", "sms_upload_enabled", "qq_credential",
    "created_date",
)


class OfficeRepository:
    def __init__(self, connection):
        self.connection = connection

    def listar(self):
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id, office_id, office_number, office_name, status, office_type, is_corporate_hq,"
                " phone_number, email, street_address, city, state, zip, monthly_sales_goal, active_users,"
                " total_users, shared_email_account, sms_upload_enabled, qq_credential, created_date,"
                " uploaded_at FROM staging_hub.offices ORDER BY office_name"
            )
            return cursor.fetchall()
        finally:
            cursor.close()

    def bloquear_por_office_id(self, office_id):
        """Bloquea y devuelve la fila vigente para ese office_id, si existe."""
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id, office_id, office_number, office_name, status, office_type, is_corporate_hq,"
                " phone_number, email, street_address, city, state, zip, monthly_sales_goal, active_users,"
                " total_users, shared_email_account, sms_upload_enabled, qq_credential, created_date"
                " FROM staging_hub.offices WHERE office_id=%s FOR UPDATE",
                (office_id,),
            )
            return cursor.fetchone()
        finally:
            cursor.close()

    def crear(self, registro: Office) -> int:
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                "INSERT INTO staging_hub.offices (" + ", ".join(OFFICE_COLUMNS) + ")"
                " VALUES (" + ", ".join(["%s"] * len(OFFICE_COLUMNS)) + ")",
                tuple(getattr(registro, column) for column in OFFICE_COLUMNS),
            )
            return cursor.lastrowid
        finally:
            cursor.close()

    def actualizar(self, office_row_id, registro: Office) -> None:
        cursor = self.connection.cursor()
        try:
            asignaciones = ", ".join(f"{column}=%s" for column in OFFICE_COLUMNS)
            cursor.execute(
                f"UPDATE staging_hub.offices SET {asignaciones} WHERE id=%s",
                tuple(getattr(registro, column) for column in OFFICE_COLUMNS) + (office_row_id,),
            )
        finally:
            cursor.close()


class CommissionRateRepository:
    def __init__(self, connection):
        self.connection = connection

    def listar(self):
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id, state, carrier, transaction_type, business_line, franchise_percent, del_toro_percent,"
                " updated_by, created_at, updated_at FROM staging_hub.commission_rates"
                " ORDER BY state, carrier, transaction_type, business_line"
            )
            return cursor.fetchall()
        finally:
            cursor.close()

    def bloquear_por_clave(self, state, carrier, transaction_type, business_line, del_toro_percent):
        """Bloquea y devuelve la fila vigente, si existe, dentro de la transaccion actual."""
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id, franchise_percent, del_toro_percent FROM staging_hub.commission_rates"
                " WHERE state=%s AND carrier=%s AND transaction_type=%s AND business_line=%s AND del_toro_percent=%s FOR UPDATE",
                (state, carrier, transaction_type, business_line, del_toro_percent),
            )
            return cursor.fetchone()
        finally:
            cursor.close()

    def bloquear_por_id(self, rate_id):
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id, state, carrier, transaction_type, business_line, franchise_percent, del_toro_percent"
                " FROM staging_hub.commission_rates WHERE id=%s FOR UPDATE",
                (rate_id,),
            )
            return cursor.fetchone()
        finally:
            cursor.close()

    def crear(self, registro: CommissionRate) -> int:
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                "INSERT INTO staging_hub.commission_rates"
                " (state, carrier, transaction_type, business_line, franchise_percent, del_toro_percent, updated_by)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (registro.state, registro.carrier, registro.transaction_type, registro.business_line,
                 registro.franchise_percent, registro.del_toro_percent, registro.updated_by),
            )
            return cursor.lastrowid
        finally:
            cursor.close()

    def actualizar_percent(self, rate_id, nuevo_franchise_percent, nuevo_del_toro_percent, nuevo_business_line, changed_by) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                "UPDATE staging_hub.commission_rates"
                " SET franchise_percent=%s, del_toro_percent=%s, business_line=%s, updated_by=%s"
                " WHERE id=%s",
                (nuevo_franchise_percent, nuevo_del_toro_percent, nuevo_business_line, changed_by, rate_id),
            )
        finally:
            cursor.close()

    def registrar_historial(self, cambio: CommissionRateHistory) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                "INSERT INTO staging_hub.commission_rate_history"
                " (rate_id, state, carrier, transaction_type, business_line, previous_franchise_percent,"
                " new_franchise_percent, previous_del_toro_percent, new_del_toro_percent, changed_by)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (cambio.rate_id, cambio.state, cambio.carrier, cambio.transaction_type, cambio.business_line,
                 cambio.previous_franchise_percent, cambio.new_franchise_percent,
                 cambio.previous_del_toro_percent, cambio.new_del_toro_percent, cambio.changed_by),
            )
        finally:
            cursor.close()

    def historial(self, rate_id):
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id, previous_franchise_percent, new_franchise_percent,"
                " previous_del_toro_percent, new_del_toro_percent, changed_by, changed_at"
                " FROM staging_hub.commission_rate_history WHERE rate_id=%s"
                " ORDER BY changed_at DESC, id DESC",
                (rate_id,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
