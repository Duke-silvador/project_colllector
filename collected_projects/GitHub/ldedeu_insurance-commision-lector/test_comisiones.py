import unittest
from decimal import Decimal
from io import BytesIO
from unittest.mock import MagicMock, patch

from openpyxl import Workbook

from comisiones import (
    validar_percent, crear_comision, actualizar_comision, listar_comisiones, obtener_historial,
    parsear_excel_comisiones, importar_excel_comisiones, _analizar_nombre_hoja,
)

ENGINE_OK = [{"ENGINE": "InnoDB"}, {"ENGINE": "InnoDB"}]
LOB_POR_UPPER = {"R": "R", "MC": "MC", "CV": "CV"}


def libro_bytes(hojas):
    """hojas: dict de nombre_hoja -> lista de filas (la primera es encabezado)."""
    book = Workbook()
    book.remove(book.active)
    for nombre, filas in hojas.items():
        ws = book.create_sheet(nombre)
        for fila in filas:
            ws.append(fila)
    output = BytesIO()
    book.save(output)
    return output.getvalue()


class ValidarPercentTests(unittest.TestCase):
    def test_accepts_percentage_like_string(self):
        self.assertEqual(validar_percent("12.5"), Decimal("12.500000"))

    def test_rejects_negative(self):
        with self.assertRaises(ValueError):
            validar_percent("-1")

    def test_rejects_non_numeric(self):
        with self.assertRaises(ValueError):
            validar_percent("abc")

    def test_rejects_infinite(self):
        with self.assertRaises(ValueError):
            validar_percent(Decimal("Infinity"))


class AnalizarNombreHojaTests(unittest.TestCase):
    def test_plain_state_without_business_line_defaults_to_general(self):
        state, ttype, lines, error = _analizar_nombre_hoja("PA", LOB_POR_UPPER)
        self.assertIsNone(error)
        self.assertEqual(state, "PA")
        self.assertEqual(ttype, "NEW_BUSINESS")
        self.assertEqual(lines, [""])

    def test_renewal_without_business_line_defaults_to_general(self):
        state, ttype, lines, error = _analizar_nombre_hoja("PA_RN", LOB_POR_UPPER)
        self.assertIsNone(error)
        self.assertEqual(state, "PA")
        self.assertEqual(ttype, "RENEWAL")
        self.assertEqual(lines, [""])

    def test_single_business_line_suffix(self):
        state, ttype, lines, error = _analizar_nombre_hoja("FLORIDA-MC", LOB_POR_UPPER)
        self.assertIsNone(error)
        self.assertEqual(state, "FLORIDA")
        self.assertEqual(ttype, "NEW_BUSINESS")
        self.assertEqual(lines, ["MC"])

    def test_renewal_combined_with_business_line_is_an_error(self):
        state, ttype, lines, error = _analizar_nombre_hoja("TEXAS_RN_R-MC-CV", LOB_POR_UPPER)
        self.assertIsNone(state)
        self.assertIn("RN", error)
        self.assertIn("línea de negocio", error)

    def test_multiple_business_lines_without_renewal(self):
        state, ttype, lines, error = _analizar_nombre_hoja("TEXAS_R-MC-CV", LOB_POR_UPPER)
        self.assertIsNone(error)
        self.assertEqual(state, "TEXAS")
        self.assertEqual(ttype, "NEW_BUSINESS")
        self.assertEqual(lines, ["R", "MC", "CV"])

    def test_unknown_modifier_is_an_error(self):
        state, ttype, lines, error = _analizar_nombre_hoja("TEXAS_ZZ", LOB_POR_UPPER)
        self.assertIsNone(state)
        self.assertIn("ZZ", error)


class CrearComisionTests(unittest.TestCase):
    def _connection(self, fetchone_side_effect):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.side_effect = fetchone_side_effect
        return connection

    def test_creates_rate_and_first_history_row(self):
        connection = self._connection(list(ENGINE_OK))
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_clave.return_value = None
            repo.crear.return_value = 42
            rate_id = crear_comision("TX", "COMMONWEALTH", "NEW_BUSINESS", "MC", "0.08", "0.125", "laura")
        self.assertEqual(rate_id, 42)
        registro = repo.crear.call_args.args[0]
        self.assertEqual(registro.business_line, "MC")
        self.assertEqual(registro.franchise_percent, Decimal("0.080000"))
        self.assertEqual(registro.del_toro_percent, Decimal("0.125000"))
        cambio = repo.registrar_historial.call_args.args[0]
        self.assertEqual(cambio.business_line, "MC")
        self.assertIsNone(cambio.previous_franchise_percent)
        self.assertIsNone(cambio.previous_del_toro_percent)
        connection.commit.assert_called_once()
        connection.rollback.assert_not_called()

    def test_general_business_line_is_valid(self):
        connection = self._connection(list(ENGINE_OK))
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_clave.return_value = None
            repo.crear.return_value = 1
            crear_comision("TX", "COMMONWEALTH", "NEW_BUSINESS", "", "0.08", "0.125", "laura")
        registro = repo.crear.call_args.args[0]
        self.assertEqual(registro.business_line, "")
        connection.commit.assert_called_once()

    def test_rejects_duplicate_combination(self):
        connection = self._connection(list(ENGINE_OK))
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_clave.return_value = {"id": 5, "franchise_percent": Decimal("0.08"), "del_toro_percent": Decimal("0.1")}
            with self.assertRaises(ValueError):
                crear_comision("TX", "COMMONWEALTH", "NEW_BUSINESS", "MC", "0.08", "0.12", "laura")
            repo.crear.assert_not_called()
        connection.rollback.assert_called_once()
        connection.commit.assert_not_called()

    def test_requires_changed_by(self):
        with self.assertRaises(ValueError):
            crear_comision("TX", "COMMONWEALTH", "NEW_BUSINESS", "MC", "0.08", "0.12", "  ")

    def test_missing_table_blocks_creation(self):
        connection = self._connection([None])
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository"):
            with self.assertRaises(ValueError):
                crear_comision("TX", "COMMONWEALTH", "NEW_BUSINESS", "MC", "0.08", "0.12", "laura")
        connection.rollback.assert_called_once()


class ActualizarComisionTests(unittest.TestCase):
    def _connection(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.side_effect = list(ENGINE_OK)
        return connection

    def test_updates_rate_and_records_history(self):
        connection = self._connection()
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_id.return_value = {
                "id": 1, "state": "TX", "carrier": "COMMONWEALTH", "transaction_type": "NEW_BUSINESS",
                "business_line": "MC", "franchise_percent": Decimal("0.080000"), "del_toro_percent": Decimal("0.120000"),
            }
            actualizar_comision(1, "0.09", "0.15", "MC", "laura")
        repo.actualizar_percent.assert_called_once_with(1, Decimal("0.090000"), Decimal("0.150000"), "MC", "laura")
        cambio = repo.registrar_historial.call_args.args[0]
        self.assertEqual(cambio.business_line, "MC")
        self.assertEqual(cambio.previous_franchise_percent, Decimal("0.080000"))
        self.assertEqual(cambio.new_franchise_percent, Decimal("0.090000"))
        connection.commit.assert_called_once()

    def test_rejects_unchanged_value(self):
        connection = self._connection()
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_id.return_value = {
                "id": 1, "state": "TX", "carrier": "COMMONWEALTH", "transaction_type": "NEW_BUSINESS",
                "business_line": "MC", "franchise_percent": Decimal("0.080000"), "del_toro_percent": Decimal("0.120000"),
            }
            with self.assertRaises(ValueError):
                actualizar_comision(1, "0.08", "0.12", "MC", "laura")
            repo.actualizar_percent.assert_not_called()
        connection.rollback.assert_called_once()

    def test_rejects_missing_rate(self):
        connection = self._connection()
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo_cls.return_value.bloquear_por_id.return_value = None
            with self.assertRaises(ValueError):
                actualizar_comision(99, "0.09", "0.15", "MC", "laura")
        connection.rollback.assert_called_once()

    def test_updates_business_line_when_new_combination_is_free(self):
        connection = self._connection()
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_id.return_value = {
                "id": 1, "state": "TX", "carrier": "COMMONWEALTH", "transaction_type": "NEW_BUSINESS",
                "business_line": "", "franchise_percent": Decimal("0.080000"), "del_toro_percent": Decimal("0.120000"),
            }
            repo.bloquear_por_clave.return_value = None
            actualizar_comision(1, "0.08", "0.12", "Auto", "laura")
        repo.bloquear_por_clave.assert_called_once_with("TX", "COMMONWEALTH", "NEW_BUSINESS", "Auto", Decimal("0.120000"))
        repo.actualizar_percent.assert_called_once_with(1, Decimal("0.080000"), Decimal("0.120000"), "Auto", "laura")
        cambio = repo.registrar_historial.call_args.args[0]
        self.assertEqual(cambio.business_line, "Auto")
        connection.commit.assert_called_once()

    def test_rejects_business_line_already_used_by_another_rate(self):
        connection = self._connection()
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_id.return_value = {
                "id": 1, "state": "TX", "carrier": "COMMONWEALTH", "transaction_type": "NEW_BUSINESS",
                "business_line": "", "franchise_percent": Decimal("0.080000"), "del_toro_percent": Decimal("0.120000"),
            }
            repo.bloquear_por_clave.return_value = {"id": 2}
            with self.assertRaises(ValueError):
                actualizar_comision(1, "0.08", "0.12", "Auto", "laura")
            repo.actualizar_percent.assert_not_called()
        connection.rollback.assert_called_once()

    def test_rejects_business_line_on_renewal(self):
        connection = self._connection()
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_id.return_value = {
                "id": 1, "state": "TX", "carrier": "COMMONWEALTH", "transaction_type": "RENEWAL",
                "business_line": "", "franchise_percent": Decimal("0.080000"), "del_toro_percent": Decimal("0.120000"),
            }
            with self.assertRaises(ValueError):
                actualizar_comision(1, "0.08", "0.12", "Auto", "laura")
            repo.actualizar_percent.assert_not_called()
        connection.rollback.assert_called_once()


class ConsultaComisionTests(unittest.TestCase):
    def test_listar_comisiones_returns_repository_rows(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.side_effect = list(ENGINE_OK)
        rows = [{"id": 1, "state": "TX", "business_line": "MC"}]
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo_cls.return_value.listar.return_value = rows
            result = listar_comisiones()
        self.assertEqual(result, rows)
        connection.close.assert_called_once()

    def test_obtener_historial_returns_repository_rows(self):
        connection = MagicMock()
        rows = [{"id": 1, "previous_franchise_percent": None, "new_franchise_percent": Decimal("0.08")}]
        with patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo_cls.return_value.historial.return_value = rows
            result = obtener_historial(1)
        self.assertEqual(result, rows)


class ParsearExcelComisionesTests(unittest.TestCase):
    HEADER = ["Carrier", "Franchise%", "DelToro%"]

    def test_parses_new_business_and_renewal_sheets(self):
        data = libro_bytes({
            "PA-R": [self.HEADER, ["COMMONWEALTH", 0.08, 0.10]],
            "PA-RN": [self.HEADER, ["COMMONWEALTH", 0.08, 0.12]],
        })
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            filas = parsear_excel_comisiones(data)
        self.assertEqual(len(filas), 2)
        nb = next(f for f in filas if f["transaction_type"] == "NEW_BUSINESS")
        rn = next(f for f in filas if f["transaction_type"] == "RENEWAL")
        self.assertEqual(nb["state"], "PA")
        self.assertEqual(nb["business_line"], "R")
        self.assertEqual(nb["franchise_percent"], Decimal("0.080000"))
        self.assertEqual(rn["state"], "PA")
        self.assertEqual(rn["business_line"], "")
        self.assertEqual(rn["del_toro_percent"], Decimal("0.120000"))

    def test_renewal_combined_with_business_line_is_rejected(self):
        data = libro_bytes({"TEXAS_RN_MC": [self.HEADER, ["COMMONWEALTH", 0.08, 0.1]]})
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            with self.assertRaises(ValueError):
                parsear_excel_comisiones(data)

    def test_full_state_name_and_multiple_business_lines(self):
        data = libro_bytes({
            "Florida-MC": [self.HEADER, ["COMMONWEALTH", 0.08, 0.10]],
            "TEXAS_R-MC-CV": [self.HEADER, ["COMMONWEALTH", 0.07, 0.09]],
        })
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            filas = parsear_excel_comisiones(data)
        florida = [f for f in filas if f["state"] == "FL"]
        texas = [f for f in filas if f["state"] == "TX"]
        self.assertEqual(len(florida), 1)
        self.assertEqual(florida[0]["business_line"], "MC")
        self.assertEqual({f["business_line"] for f in texas}, {"R", "MC", "CV"})
        self.assertTrue(all(f["transaction_type"] == "NEW_BUSINESS" for f in texas))

    def test_sheet_without_business_line_is_general(self):
        data = libro_bytes({"Florida": [self.HEADER, ["COMMONWEALTH", 0.08, 0.1]]})
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            filas = parsear_excel_comisiones(data)
        self.assertEqual(len(filas), 1)
        self.assertEqual(filas[0]["state"], "FL")
        self.assertEqual(filas[0]["business_line"], "")
        self.assertEqual(filas[0]["transaction_type"], "NEW_BUSINESS")

    def test_matches_carrier_case_insensitively(self):
        data = libro_bytes({"TX-R": [self.HEADER, ["commonwealth", 0.08, 0.1]]})
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            filas = parsear_excel_comisiones(data)
        self.assertEqual(filas[0]["carrier"], "COMMONWEALTH")

    def test_rejects_invalid_state_sheet_name(self):
        data = libro_bytes({"ZZZ-MC": [self.HEADER, ["COMMONWEALTH", 0.08, 0.1]]})
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            with self.assertRaises(ValueError):
                parsear_excel_comisiones(data)

    def test_rejects_unknown_carrier(self):
        data = libro_bytes({"TX-MC": [self.HEADER, ["UNKNOWN CARRIER", 0.08, 0.1]]})
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            with self.assertRaises(ValueError):
                parsear_excel_comisiones(data)

    def test_accepts_variants_of_del_toro_in_same_sheet(self):
        data = libro_bytes({"TX-MC": [self.HEADER, ["COMMONWEALTH", 0.08, 0.1], ["COMMONWEALTH", 0.09, 0.11]]})
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            self.assertEqual(len(parsear_excel_comisiones(data)), 2)

    def test_rejects_missing_columns(self):
        data = libro_bytes({"TX-MC": [["Carrier", "Franchise%"], ["COMMONWEALTH", 0.08]]})
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]):
            with self.assertRaises(ValueError):
                parsear_excel_comisiones(data)


class ImportarExcelComisionesTests(unittest.TestCase):
    HEADER = ["Carrier", "Franchise%", "DelToro%"]

    def test_upserts_created_updated_and_unchanged(self):
        data = libro_bytes({"TX-MC": [
            self.HEADER,
            ["COMMONWEALTH", 0.08, 0.10],   # no existe: se crea
            ["GEICO", 0.07, 0.10],          # existe distinto: se actualiza
        ]})
        connection = MagicMock()
        connection.cursor.return_value.fetchone.side_effect = list(ENGINE_OK)
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH", "GEICO"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]), \
             patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value

            def bloquear_por_clave(state, carrier, transaction_type, business_line, del_toro_percent):
                if carrier == "GEICO":
                    return {"id": 7, "franchise_percent": Decimal("0.05"), "del_toro_percent": Decimal("0.09")}
                return None

            repo.bloquear_por_clave.side_effect = bloquear_por_clave
            repo.crear.return_value = 99
            resumen = importar_excel_comisiones(data, "laura")
        self.assertEqual(resumen, {"creadas": 1, "actualizadas": 1, "sin_cambios": 0, "total": 2})
        repo.crear.assert_called_once()
        repo.actualizar_percent.assert_called_once_with(7, Decimal("0.070000"), Decimal("0.100000"), "MC", "laura")
        connection.commit.assert_called_once()

    def test_unchanged_rows_are_skipped(self):
        data = libro_bytes({"TX-MC": [self.HEADER, ["COMMONWEALTH", 0.08, 0.10]]})
        connection = MagicMock()
        connection.cursor.return_value.fetchone.side_effect = list(ENGINE_OK)
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]), \
             patch("comisiones.conectar", return_value=connection), \
             patch("comisiones.CommissionRateRepository") as repo_cls:
            repo = repo_cls.return_value
            repo.bloquear_por_clave.return_value = {
                "id": 1, "franchise_percent": Decimal("0.080000"), "del_toro_percent": Decimal("0.100000"),
            }
            resumen = importar_excel_comisiones(data, "laura")
        self.assertEqual(resumen, {"creadas": 0, "actualizadas": 0, "sin_cambios": 1, "total": 1})
        repo.crear.assert_not_called()
        repo.actualizar_percent.assert_not_called()

    def test_invalid_rows_abort_before_any_write(self):
        data = libro_bytes({"ZZZ-MC": [self.HEADER, ["COMMONWEALTH", 0.08, 0.1]]})
        connection = MagicMock()
        with patch("comisiones.cargar_carriers", return_value=["COMMONWEALTH"]), \
             patch("comisiones.cargar_lineas_negocio", return_value=["R", "MC", "CV"]), \
             patch("comisiones.conectar", return_value=connection):
            with self.assertRaises(ValueError):
                importar_excel_comisiones(data, "laura")
        connection.cursor.assert_not_called()


if __name__ == "__main__":
    unittest.main()
