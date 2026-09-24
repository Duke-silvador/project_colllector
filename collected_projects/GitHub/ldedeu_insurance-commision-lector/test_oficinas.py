import unittest
from decimal import Decimal
from io import BytesIO
from unittest.mock import MagicMock, patch

from openpyxl import Workbook

from oficinas import (
    _booleano, _decimal, _entero, _fecha, _texto,
    cargar_mapa_office_numbers, crear_oficina, listar_oficinas, parsear_excel_oficinas, importar_excel_oficinas,
)
from repositories import OFFICE_COLUMNS

ENGINE_OK = {"ENGINE": "InnoDB"}

HEADER = [
    "Office ID", "Office #", "Office Name", "Status", "Office Type", "Corporate HQ?",
    "Phone Number", "Email", "Street Address", "City", "State", "Zip", "Monthly Sales Goal",
    "Active Users", "Total Users", "Shared Email Account", "SMS Upload Enabled", "QQ Credential",
    "Created Date",
]


def fila_completa(office_id="OFF-1", office_name="Miami HQ", **overrides):
    valores = {
        "office_id": office_id, "office_number": "120", "office_name": office_name, "status": "Active",
        "office_type": "Branch", "is_corporate_hq": "No", "phone_number": "305-555-0000",
        "email": "miami@deltoro.com", "street_address": "123 Main St", "city": "Miami", "state": "FL",
        "zip": "33101", "monthly_sales_goal": "50000", "active_users": "10", "total_users": "12",
        "shared_email_account": "Yes", "sms_upload_enabled": "No", "qq_credential": "QQ-1",
        "created_date": "01/15/2024",
    }
    valores.update(overrides)
    return [
        valores["office_id"], valores["office_number"], valores["office_name"], valores["status"],
        valores["office_type"], valores["is_corporate_hq"], valores["phone_number"], valores["email"],
        valores["street_address"], valores["city"], valores["state"], valores["zip"],
        valores["monthly_sales_goal"], valores["active_users"], valores["total_users"],
        valores["shared_email_account"], valores["sms_upload_enabled"], valores["qq_credential"],
        valores["created_date"],
    ]


def libro_bytes(filas, header=HEADER):
    book = Workbook()
    ws = book.active
    ws.append(header)
    for fila in filas:
        ws.append(fila)
    output = BytesIO()
    book.save(output)
    return output.getvalue()


class HelperTests(unittest.TestCase):
    def test_texto_strips_and_blank_becomes_none(self):
        self.assertEqual(_texto("  Miami  "), "Miami")
        self.assertIsNone(_texto(""))
        self.assertIsNone(_texto(None))

    def test_booleano_recognizes_common_values(self):
        for valor in ("Si", "SÍ", "Yes", "y", "true", "1", "x"):
            self.assertTrue(_booleano(valor))
        for valor in ("No", "n", "false", "0", "", None):
            self.assertFalse(_booleano(valor))
        self.assertTrue(_booleano(True))

    def test_booleano_rejects_unknown_value(self):
        with self.assertRaises(ValueError):
            _booleano("maybe")

    def test_entero_parses_numbers_and_blank_is_none(self):
        self.assertEqual(_entero("10"), 10)
        self.assertEqual(_entero(10.0), 10)
        self.assertIsNone(_entero(""))
        self.assertIsNone(_entero(None))

    def test_entero_rejects_invalid(self):
        with self.assertRaises(ValueError):
            _entero("abc")

    def test_decimal_parses_numbers_and_blank_is_none(self):
        self.assertEqual(_decimal("50000"), Decimal("50000"))
        self.assertIsNone(_decimal(""))

    def test_decimal_rejects_invalid(self):
        with self.assertRaises(ValueError):
            _decimal("abc")

    def test_fecha_parses_common_formats_and_blank_is_none(self):
        self.assertEqual(_fecha("01/15/2024").year, 2024)
        self.assertEqual(_fecha("2024-01-15").day, 15)
        self.assertIsNone(_fecha(""))
        self.assertIsNone(_fecha(None))

    def test_fecha_rejects_invalid(self):
        with self.assertRaises(ValueError):
            _fecha("not-a-date")


class CrearOficinaTests(unittest.TestCase):
    def _connection(self, fetchone_side_effect):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.side_effect = fetchone_side_effect
        return connection

    def test_creates_office(self):
        connection = self._connection([ENGINE_OK])
        with patch("oficinas.conectar", return_value=connection), \
             patch("oficinas.OfficeRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_office_id.return_value = None
            repo.crear.return_value = 1
            office_row_id = crear_oficina({"office_id": "OFF-1", "office_name": "Miami HQ"})
        self.assertEqual(office_row_id, 1)
        registro = repo.crear.call_args.args[0]
        self.assertEqual(registro.office_id, "OFF-1")
        self.assertEqual(registro.office_name, "Miami HQ")
        self.assertFalse(registro.is_corporate_hq)
        connection.commit.assert_called_once()

    def test_requires_office_id_and_name(self):
        with self.assertRaises(ValueError):
            crear_oficina({"office_id": "", "office_name": "Miami HQ"})
        with self.assertRaises(ValueError):
            crear_oficina({"office_id": "OFF-1", "office_name": "  "})

    def test_rejects_duplicate_office_id(self):
        connection = self._connection([ENGINE_OK])
        with patch("oficinas.conectar", return_value=connection), \
             patch("oficinas.OfficeRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_office_id.return_value = {"id": 5}
            with self.assertRaises(ValueError):
                crear_oficina({"office_id": "OFF-1", "office_name": "Miami HQ"})
            repo.crear.assert_not_called()
        connection.rollback.assert_called_once()

    def test_missing_table_blocks_creation(self):
        connection = self._connection([None])
        with patch("oficinas.conectar", return_value=connection), \
             patch("oficinas.OfficeRepository"):
            with self.assertRaises(ValueError):
                crear_oficina({"office_id": "OFF-1", "office_name": "Miami HQ"})
        connection.rollback.assert_called_once()


class ListarOficinasTests(unittest.TestCase):
    def test_returns_repository_rows(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = ENGINE_OK
        rows = [{"id": 1, "office_id": "OFF-1", "office_name": "Miami HQ"}]
        with patch("oficinas.conectar", return_value=connection), \
             patch("oficinas.OfficeRepository") as repo_cls:
            repo_cls.return_value.listar.return_value = rows
            result = listar_oficinas()
        self.assertEqual(result, rows)
        connection.close.assert_called_once()


class CargarMapaOfficeNumbersTests(unittest.TestCase):
    def test_maps_office_id_to_office_number_skipping_nulls(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchall.return_value = [
            {"office_id": "compass-uuid-1", "office_number": "82"},
        ]
        mapa = cargar_mapa_office_numbers(connection)
        self.assertEqual(mapa, {"compass-uuid-1": "82"})


class ParsearExcelOficinasTests(unittest.TestCase):
    def test_parses_full_row(self):
        data = libro_bytes([fila_completa()])
        filas = parsear_excel_oficinas(data)
        self.assertEqual(len(filas), 1)
        registro = filas[0]
        self.assertEqual(registro.office_id, "OFF-1")
        self.assertEqual(registro.office_name, "Miami HQ")
        self.assertEqual(registro.monthly_sales_goal, Decimal("50000"))
        self.assertEqual(registro.active_users, 10)
        self.assertTrue(registro.shared_email_account)
        self.assertFalse(registro.is_corporate_hq)

    def test_only_office_id_and_name_are_required(self):
        data = libro_bytes([["OFF-2", "Tampa"]], header=["Office ID", "Office Name"])
        filas = parsear_excel_oficinas(data)
        self.assertEqual(len(filas), 1)
        self.assertEqual(filas[0].office_id, "OFF-2")
        self.assertEqual(filas[0].office_name, "Tampa")
        self.assertIsNone(filas[0].monthly_sales_goal)

    def test_rejects_missing_required_columns(self):
        data = libro_bytes([["Tampa"]], header=["Office Name"])
        with self.assertRaises(ValueError):
            parsear_excel_oficinas(data)

    def test_rejects_duplicate_office_id(self):
        data = libro_bytes([fila_completa(office_id="OFF-1"), fila_completa(office_id="OFF-1")])
        with self.assertRaises(ValueError):
            parsear_excel_oficinas(data)

    def test_rejects_missing_office_id_in_row(self):
        data = libro_bytes([fila_completa(office_id="")])
        with self.assertRaises(ValueError):
            parsear_excel_oficinas(data)

    def test_rejects_invalid_boolean(self):
        data = libro_bytes([fila_completa(is_corporate_hq="maybe")])
        with self.assertRaises(ValueError):
            parsear_excel_oficinas(data)


class ImportarExcelOficinasTests(unittest.TestCase):
    def test_upserts_created_updated_and_unchanged(self):
        data = libro_bytes([fila_completa(office_id="OFF-1"), fila_completa(office_id="OFF-2")])
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = ENGINE_OK
        with patch("oficinas.conectar", return_value=connection), \
             patch("oficinas.OfficeRepository") as repo_cls:
            repo = repo_cls.return_value

            def bloquear_por_office_id(office_id):
                if office_id == "OFF-2":
                    return {"id": 9, "office_id": "OFF-2", "office_number": "999", "office_name": "Miami HQ",
                            "status": "Active", "office_type": "Branch", "is_corporate_hq": False,
                            "phone_number": "305-555-0000", "email": "miami@deltoro.com",
                            "street_address": "123 Main St", "city": "Miami", "state": "FL", "zip": "33101",
                            "monthly_sales_goal": Decimal("50000"), "active_users": 10, "total_users": 12,
                            "shared_email_account": True, "sms_upload_enabled": False, "qq_credential": "QQ-1",
                            "created_date": None}
                return None

            repo.bloquear_por_office_id.side_effect = bloquear_por_office_id
            repo.crear.return_value = 1
            resumen = importar_excel_oficinas(data)
        self.assertEqual(resumen, {"creadas": 1, "actualizadas": 1, "sin_cambios": 0, "total": 2})
        repo.crear.assert_called_once()
        repo.actualizar.assert_called_once()

    def test_unchanged_rows_are_skipped(self):
        data = libro_bytes([fila_completa(office_id="OFF-1")])
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = ENGINE_OK
        with patch("oficinas.conectar", return_value=connection), \
             patch("oficinas.OfficeRepository") as repo_cls:
            repo = repo_cls.return_value
            filas = parsear_excel_oficinas(data)
            registro = filas[0]
            existente = {"id": 1, **{campo: getattr(registro, campo) for campo in OFFICE_COLUMNS}}
            repo.bloquear_por_office_id.return_value = existente
            resumen = importar_excel_oficinas(data)
        self.assertEqual(resumen, {"creadas": 0, "actualizadas": 0, "sin_cambios": 1, "total": 1})
        repo.crear.assert_not_called()
        repo.actualizar.assert_not_called()

    def test_invalid_rows_abort_before_any_write(self):
        data = libro_bytes([fila_completa(office_id="")])
        connection = MagicMock()
        with patch("oficinas.conectar", return_value=connection):
            with self.assertRaises(ValueError):
                importar_excel_oficinas(data)
        connection.cursor.assert_not_called()


if __name__ == "__main__":
    unittest.main()
