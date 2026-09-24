import unittest
from contextlib import ExitStack
from decimal import Decimal
from unittest.mock import MagicMock, patch

import conciliacion_ui as ui


class ImportesEsperadosTests(unittest.TestCase):
    """_importes_esperados: cuando el total es la suma de varios cheques que llegan como
    transacciones bancarias separadas (BASS, CRC GROUP), hay que buscar cada pedazo por su
    cuenta en vez del total combinado."""

    def test_returns_total_when_rows_have_no_check_amount(self):
        rows = [dict(commission_amount=10), dict(commission_amount=20)]
        self.assertEqual(ui._importes_esperados(rows, 30), [30])

    def test_returns_one_piece_per_distinct_check_when_there_are_several(self):
        rows = [
            dict(file_id='f1', source_page=1, check_amount=Decimal('243.90')),
            dict(file_id='f1', source_page=1, check_amount=Decimal('243.90')),  # misma pagina, otra fila
            dict(file_id='f2', source_page=1, check_amount=Decimal('97.60')),
        ]
        piezas = ui._importes_esperados(rows, Decimal('341.50'))
        self.assertEqual(sorted(piezas), [Decimal('97.60'), Decimal('243.90')])

    def test_returns_total_when_only_one_check_this_month(self):
        rows = [dict(file_id='f1', source_page=1, check_amount=Decimal('243.90'))]
        self.assertEqual(ui._importes_esperados(rows, Decimal('243.90')), [Decimal('243.90')])


class CompassPreviewTests(unittest.TestCase):
    def setUp(self):
        # Estas pruebas comprueban conciliación; los controles de tabla se
        # verifican por separado con Streamlit AppTest.
        table = patch.object(ui, 'mostrar_tabla', side_effect=lambda rows, key, st: st.dataframe(rows))
        table.start()
        self.addCleanup(table.stop)

    def test_history_results_display_type_franchise_and_office(self):
        rows = [dict(policy_number='P1', transaction_type='RENEWAL', transaction_type_source='historico',
                     franchise_number='DTF0134', franchise_number_source='historico', office_number='DTF0134')]
        with patch.object(ui, 'st') as st:
            ui.mostrar_resultados_compass(rows)
        detalle = st.dataframe.call_args.args[0][0]
        self.assertEqual(detalle['Resultado'], 'Se obtuvo del histórico')
        self.assertEqual(detalle['Tipo en histórico'], 'RENEWAL')
        self.assertEqual(detalle['Franquicia'], 'DTF0134')
        self.assertEqual(detalle['Oficina'], 'DTF0134')
        self.assertEqual(detalle['Tipo en Compass'], '')
        st.success.assert_called_once()

    def test_client_name_search_results_are_labeled_as_visual_search(self):
        """TOWER HILL: cuando la franquicia se obtuvo por Company Search (nombre del
        cliente, sin poliza en Compass), debe verse claramente distinta del historico."""
        rows = [dict(policy_number='P1', transaction_type='RENEWAL', transaction_type_source='historico',
                     franchise_number='DTF0120', franchise_number_source='compass_visual', office_number='DTF0120')]
        with patch.object(ui, 'st') as st:
            ui.mostrar_resultados_compass(rows)
        detalle = st.dataframe.call_args.args[0][0]
        self.assertEqual(detalle['Franquicia'], 'DTF0120')
        self.assertEqual(detalle['Fuente franquicia'], 'compass_visual')
        self.assertIn('búsqueda visual', detalle['Origen franquicia'])

    def test_chargeback_only_statement_shows_results_instead_of_empty_table(self):
        """Regresion: un statement de COMMONWEALTH que solo trae chargebacks (sin numero de
        poliza) no debe caer en el atajo de 'ya resuelto por tabla de codigos' -esa tabla
        filtra por poliza y quedaba vacia, pareciendo que el boton no conecto con Compass-.
        Los chargebacks deben verse con su franquicia (o su alerta en rojo) en el resultado."""
        rows = [
            dict(policy_number='', transaction_type='Motor Vehicle Report x 1 for tx12ia5',
                 franchise_number='DTF0073', commission_alert=None, carrier='COMMONWEALTH'),
            dict(policy_number='', transaction_type='Accident Report x 2 for unknown',
                 franchise_number=None, commission_alert='Chargeback: código unknown sin franquicia única registrada para Commonwealth',
                 carrier='COMMONWEALTH'),
        ]
        with patch.object(ui, 'st') as st:
            ui.mostrar_resultados_compass(rows)
        detalles = st.dataframe.call_args.args[0]
        self.assertEqual(len(detalles), 2)
        self.assertEqual(detalles[0]['Resultado'], 'Chargeback con franquicia asignada')
        self.assertEqual(detalles[0]['Franquicia'], 'DTF0073')
        self.assertEqual(detalles[1]['Resultado'], 'Chargeback sin franquicia')
        self.assertTrue(detalles[1]['Alerta código'])
        st.warning.assert_called_once()

    def test_review_before_export_and_failed_retry_clears_preview(self):
        rows = [dict(policy_number='P1', accounting_month='2026-08-01',
                     office_number='73', transaction_type='RENEWAL', compass_policy_id='pid'),
                dict(policy_number='P2', accounting_month='2026-08-01',
                     office_number='73', transaction_type=None, type_lookup_error='policy_not_found')]
        snapshot = dict(rows=rows, grand_total=10, file_id=1)
        transaction = dict(row=2, description='COMMONWEALTH', amount=10)
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_comisiones_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = [transaction]
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_comisiones_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Consultar Compass'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['generar_excel'].assert_not_called()
            table = st.dataframe.call_args.args[0]
            self.assertEqual(table[0]['Resultado'], 'Tipo obtenido')
            self.assertEqual(table[1]['Detalle'], 'policy_not_found')
            self.assertEqual(table[1]['Tipo en Compass'], '')
            st.error.assert_not_called()

            mocked['cargar_comisiones_excel'].reset_mock()
            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['generar_excel'].assert_called_once()
            self.assertEqual(mocked['guardar_resultado'].call_count, 2)
            self.assertEqual(st.download_button.call_count, 2)
            self.assertEqual(mocked['generar_excel'].call_args.args[0], rows)
            self.assertFalse(any(call.kwargs.get('consultar_tipos')
                                 for call in mocked['cargar_comisiones_excel'].call_args_list))
            st.error.assert_not_called()

            def load(*args, **kwargs):
                if kwargs.get('consultar_tipos'):
                    raise ValueError('Bot no disponible')
                return rows
            mocked['cargar_comisiones_excel'].side_effect = load
            st.button.side_effect = lambda label, **kw: label == 'Consultar Compass'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            self.assertFalse(any(k.startswith('compass_preview_') for k in st.session_state))
            st.error.assert_called_with('Bot no disponible')

    def test_bank_search_falls_back_to_exact_amount_when_carrier_name_not_found(self):
        """Si el carrier no aparece en Description ni por terminos configurados, se busca en
        todo el banco por el importe exacto del reporte; con una sola coincidencia se usa
        automaticamente para generar el Excel."""
        rows = [dict(policy_number='P1', accounting_month='2026-08-01',
                     office_number='73', transaction_type='RENEWAL', compass_policy_id='pid')]
        snapshot = dict(rows=rows, grand_total=10, file_id=1)
        monto_match = dict(row=5, description='WIRE TRANSFER XYZ', amount=10)
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_comisiones_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'buscar_transacciones_por_monto',
                'cargar_mapa_franquicias', 'cargar_mapa_office_numbers', 'cargar_codigos_master',
                'obtener_token', 'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = []
            mocked['buscar_transacciones_por_monto'].return_value = [monto_match]
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_comisiones_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Consultar Compass'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['buscar_transacciones_por_monto'].assert_called_once()
            self.assertTrue(any('se buscó por el importe exacto' in str(call.args[0])
                                for call in st.info.call_args_list))
            st.warning.assert_not_called()

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['generar_excel'].assert_called_once()

    def test_crc_group_bank_fallback_searches_each_check_separately_and_sums_via_multiselect(self):
        """CRC GROUP: el total del mes es la suma de varios cheques que se depositan por
        separado. Si el carrier no aparece en Description, se busca cada cheque por su
        importe individual (no el total combinado) y se suman via el multiselect."""
        rows = [
            dict(policy_number='P1', accounting_month='2026-08-01', file_id='f1', source_page=1,
                 check_amount=Decimal('243.90'), office_number='3', transaction_type='REN', compass_policy_id='pid'),
            dict(policy_number='P2', accounting_month='2026-08-01', file_id='f2', source_page=1,
                 check_amount=Decimal('97.60'), office_number='3', transaction_type='REN', compass_policy_id='pid'),
        ]
        snapshot = dict(rows=rows, grand_total=Decimal('341.50'), file_id=None)
        matches = [dict(row=5, description='CHECK DEPOSIT 1', amount=Decimal('243.90')),
                   dict(row=6, description='CHECK DEPOSIT 2', amount=Decimal('97.60'))]
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_crc_group_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'buscar_transacciones_por_montos',
                'cargar_mapa_franquicias', 'cargar_mapa_office_numbers', 'cargar_codigos_master',
                'obtener_token', 'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            st.checkbox.return_value = False  # no omitir la conciliacion bancaria en esta prueba
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = []
            mocked['buscar_transacciones_por_montos'].return_value = matches
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_crc_group_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'CRC GROUP')
            mocked['buscar_transacciones_por_montos'].assert_called_once()
            piezas_buscadas = mocked['buscar_transacciones_por_montos'].call_args.args[3]
            self.assertEqual(sorted(piezas_buscadas), [Decimal('97.60'), Decimal('243.90')])
            mocked['generar_excel'].assert_called_once()

    def test_bass_bank_fallback_searches_each_check_separately_and_sums_via_multiselect(self):
        """BASS: mismo caso que CRC GROUP -el total del mes es la suma de varios cheques que se
        depositan por separado-, pero se habia quedado fuera de la lista que permite seleccionar
        y sumar varias transacciones bancarias (se forzaba una sola con el selectbox)."""
        rows = [
            dict(policy_number='P1', accounting_month='2026-08-01', file_id='f1', source_page=1,
                 check_amount=Decimal('95.04'), office_number='3', transaction_type='NBUS', compass_policy_id='pid'),
            dict(policy_number='P2', accounting_month='2026-08-01', file_id='f2', source_page=1,
                 check_amount=Decimal('55.40'), office_number='3', transaction_type='NBUS', compass_policy_id='pid'),
        ]
        snapshot = dict(rows=rows, grand_total=Decimal('150.44'), file_id=None)
        matches = [dict(row=686, description='Preencoded Deposit BASS UNDERWRITERS', amount=Decimal('95.04')),
                   dict(row=688, description='Preencoded Deposit BASS UNDERWRITERS', amount=Decimal('55.40'))]
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_bass_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'buscar_transacciones_por_montos',
                'cargar_mapa_franquicias', 'cargar_mapa_office_numbers', 'cargar_codigos_master',
                'obtener_token', 'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            st.checkbox.return_value = False
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = []
            mocked['buscar_transacciones_por_montos'].return_value = matches
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_bass_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'BASS')
            sum_call = next(c for c in st.multiselect.call_args_list if c.args[0] == 'Transacciones bancarias a sumar')
            self.assertEqual(sorted(sum_call.args[1]), [('Sheet1', 686), ('Sheet1', 688)])
            mocked['generar_excel'].assert_called_once()

    def test_the_general_sums_several_bank_transactions_via_multiselect(self):
        """THE GENERAL puede llegar depositado en el banco en varias transacciones separadas
        (no un solo depósito); el usuario debe poder seleccionarlas y sumarlas, como ya pasa
        con ASSURANCE/CRC GROUP/ORCHID/SLIDE, en vez de forzar una sola fila con el selectbox."""
        rows = [dict(policy_number='FL8606397', accounting_month='2026-08-01')]
        snapshot = dict(rows=rows, grand_total=Decimal('341.50'), file_id=None)
        matches = [dict(row=5, description='THE GENERAL DEPOSIT 1', amount=Decimal('243.90')),
                   dict(row=6, description='THE GENERAL DEPOSIT 2', amount=Decimal('97.60'))]
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_the_general_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = matches
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_the_general_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'THE GENERAL')
            sum_call = next(c for c in st.multiselect.call_args_list if c.args[0] == 'Transacciones bancarias a sumar')
            self.assertEqual(sorted(sum_call.args[1]), [('Sheet1', 5), ('Sheet1', 6)])
            mocked['generar_excel'].assert_called_once()

    def test_swyfft_explains_bank_difference_with_check_derived_rows(self):
        """SWYFFT paga una parte por cheque físico; el banco puede no traer una descripción
        legible para ese pago (o no haberlo depositado todavía), así que la transacción
        encontrada no cubre el total del statement. En vez de dejar esa diferencia sin explicar,
        se compara contra lo importado de talones de cheque (source_sheet SWYFFT_CHEQUE)."""
        rows = [dict(policy_number='CA92-000831-00', accounting_month='2026-09-01',
                     commission_amount='483.50', source_sheet='SWYFFT_CHEQUE'),
                dict(policy_number='OTHER1', accounting_month='2026-09-01',
                     commission_amount='100.00', source_sheet='SWYFFT')]
        snapshot = dict(rows=rows, grand_total=Decimal('583.50'), file_id=None)
        matches = [dict(row=5, description='SWYFFT DEPOSIT', amount=Decimal('100.00'))]
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_swyfft_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = matches
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_swyfft_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'SWYFFT')
            mensajes_info = [c.args[0] for c in st.info.call_args_list]
            self.assertTrue(any('483.50' in m and 'talones de cheque' in m for m in mensajes_info))

    def test_bank_search_warns_when_neither_name_nor_amount_match(self):
        rows = [dict(policy_number='P1', accounting_month='2026-08-01',
                     office_number='73', transaction_type='RENEWAL', compass_policy_id='pid')]
        snapshot = dict(rows=rows, grand_total=10, file_id=1)
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_comisiones_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'buscar_transacciones_por_monto',
                'cargar_mapa_franquicias', 'cargar_mapa_office_numbers', 'cargar_codigos_master',
                'obtener_token', 'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = []
            mocked['buscar_transacciones_por_monto'].return_value = []
            mocked['cargar_comisiones_excel'].return_value = rows

            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['buscar_transacciones_por_monto'].assert_called_once()
            mocked['generar_excel'].assert_not_called()
            st.warning.assert_called_with('No se encontraron transacciones con COMMONWEALTH en Description ni por el importe 10.')

    def test_bank_amount_mismatch_does_not_block_export(self):
        """Regresion: si la transaccion bancaria encontrada no coincide exactamente con el
        total del reporte, ya no se bloquea; se sigue el flujo normal (se genera el Excel) y
        solo se avisa de la diferencia, sin detener el proceso."""
        rows = [dict(policy_number='P1', accounting_month='2026-08-01',
                     office_number='73', transaction_type='RENEWAL', compass_policy_id='pid')]
        snapshot = dict(rows=rows, grand_total=10, file_id=1)
        transaction = dict(row=2, description='COMMONWEALTH', amount=7)  # no coincide con el total (10)
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_comisiones_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = [transaction]
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_comisiones_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Consultar Compass'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['generar_excel'].assert_not_called()
            self.assertTrue(any('no coincide exactamente' in str(call.args[0]) for call in st.warning.call_args_list))

            st.warning.reset_mock()
            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['generar_excel'].assert_called_once()
            self.assertEqual(mocked['generar_excel'].call_args.args[5], [{'sheet': 'Sheet1', 'row': 2}])
            self.assertTrue(any('diferencia bancaria' in str(call.args[0]) for call in st.warning.call_args_list))

    def test_the_general_does_not_show_the_flat_sum_mismatch_warning(self):
        """Para THE GENERAL, esta suma es solo la busqueda por nombre/terminos (sin el codigo
        master ni el desglose por codigo); el chequeo real, correcto, ocurre despues dentro del
        Pivot del Excel generado. Mostrar esta advertencia aqui con una suma incompleta solo
        confunde, así que se omite (a diferencia de los demas carriers, que si la ven)."""
        rows = [dict(policy_number='FL1', accounting_month='2026-08-01', commission_amount=Decimal('2573.49'))]
        snapshot = dict(rows=rows, grand_total=Decimal('2573.49'), file_id=None)
        transaction = dict(row=2, description='The General PGA091479', amount=Decimal('343.94'))  # no coincide con el total
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_the_general_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = [transaction]
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_the_general_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'THE GENERAL')
            mocked['generar_excel'].assert_called_once()
            self.assertFalse(any('no coincide exactamente' in str(call.args[0]) for call in st.warning.call_args_list))

    def test_bank_transactions_from_different_sheets_are_combined(self):
        """Regresion: una transaccion puede aparecer en otra hoja del mismo banco; al elegir
        varias hojas a la vez, los resultados de todas se combinan en una sola tabla (marcando
        de que hoja viene cada fila) en vez de perderse al cambiar de hoja."""
        rows = [dict(policy_number='P1', accounting_month='2026-08-01',
                     office_number='73', transaction_type='RENEWAL', compass_policy_id='pid')]
        snapshot = dict(rows=rows, grand_total=10, file_id=1)
        def buscar(data, sheet, header, carrier, terminos):
            return [dict(row=2, description='COMMONWEALTH', amount=10)] if sheet == 'Sheet2' else []
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_comisiones_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            def multiselect_side_effect(label, options, default=None, **kw):
                if label == 'Hoja(s) del banco':
                    return list(options)  # el usuario elige buscar en todas las hojas a la vez
                return default
            st.multiselect.side_effect = multiselect_side_effect
            mocked['hojas_excel'].return_value = ['Sheet1', 'Sheet2']
            mocked['buscar_transacciones'].side_effect = buscar
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_comisiones_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: label == 'Consultar Compass'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            self.assertEqual(mocked['buscar_transacciones'].call_count, 2)

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'COMMONWEALTH')
            mocked['generar_excel'].assert_called_once()
            self.assertEqual(mocked['generar_excel'].call_args.args[5], [{'sheet': 'Sheet2', 'row': 2}])

    def test_bank_sum_multiselect_key_changes_when_bank_sheets_selection_changes(self):
        """Regresion: si el usuario agrega una hoja del banco a la busqueda (ahora aparecen
        mas transacciones), el multiselect 'Transacciones bancarias a sumar' debe usar una key
        distinta a la de antes. Sin esto, Streamlit reutiliza la seleccion vieja guardada bajo
        la misma key (con menos transacciones) en vez de aplicar el nuevo default con todas
        seleccionadas, y el Excel sale con una transaccion real de menos, sin ningun aviso."""
        rows = [dict(policy_number='P1', accounting_month='2026-08-01',
                     franchise_number='DTF0082', producer_code='12IA')]
        snapshot = dict(rows=rows, grand_total=Decimal('10'), file_id=1)
        def buscar(data, sheet, header, carrier, terminos):
            if sheet == 'Sheet1':
                return [dict(row=2, description='ASSURANCE uno', amount=Decimal('4'))]
            return [dict(row=3, description='ASSURANCE dos', amount=Decimal('6'))]
        hojas_elegidas = ['Sheet1']
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_assurance_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            def multiselect_side_effect(label, options, default=None, **kw):
                if label == 'Hoja(s) del banco':
                    return list(hojas_elegidas)
                return default
            st.multiselect.side_effect = multiselect_side_effect
            mocked['hojas_excel'].return_value = ['Sheet1', 'Sheet2']
            mocked['buscar_transacciones'].side_effect = buscar
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_assurance_excel'].return_value = rows

            st.button.side_effect = lambda label, **kw: False
            ui.mostrar_conciliacion(snapshot, 'test', 'ASSURANCE')
            primera_key = next(c.kwargs['key'] for c in st.multiselect.call_args_list
                               if c.args[0] == 'Transacciones bancarias a sumar')

            st.multiselect.reset_mock()
            hojas_elegidas = ['Sheet1', 'Sheet2']
            ui.mostrar_conciliacion(snapshot, 'test', 'ASSURANCE')
            segunda_key = next(c.kwargs['key'] for c in st.multiselect.call_args_list
                               if c.args[0] == 'Transacciones bancarias a sumar')
            self.assertNotEqual(primera_key, segunda_key)

    def test_stale_excel_is_not_reused_after_underlying_rows_change(self):
        """Regresion: para carriers 'peninsula' (BASS, ASSURANCE...) la vista previa se
        refresca sola en cada rerun, pero el Excel generado no debe seguir ofreciendose
        si los datos subyacentes cambiaron (nueva importacion/correccion), aunque no se
        aprete 'Actualizar comisiones'."""
        rows = [dict(policy_number='P1', accounting_month='2026-08-01', office_number='73',
                     transaction_type='RENEWAL', compass_policy_id='pid', id=1, commission_amount='10',
                     franchise_number='DTF0073', franchise_percent='0.08')]
        snapshot = dict(rows=rows, grand_total=10, file_id=1)
        transaction = dict(row=2, description='BASS', amount=10)
        with ExitStack() as stack:
            mocked = {name: stack.enter_context(patch.object(ui, name)) for name in (
                'st', 'conectar', 'cargar_bass_excel', 'ruta_resultado',
                'hojas_excel', 'buscar_transacciones', 'cargar_mapa_franquicias',
                'cargar_mapa_office_numbers', 'cargar_codigos_master', 'obtener_token',
                'generar_excel', 'generar_excel_solo_reporte', 'guardar_resultado')}
            st = mocked['st']
            st.session_state = {}
            st.file_uploader.return_value.size = 1
            st.file_uploader.return_value.getvalue.return_value = b'bank'
            st.number_input.return_value = 1
            st.selectbox.side_effect = lambda label, options, **kw: options[0]
            st.multiselect.side_effect = lambda label, options, default=None, **kw: default
            mocked['hojas_excel'].return_value = ['Sheet1']
            mocked['buscar_transacciones'].return_value = [transaction]
            mocked['ruta_resultado'].return_value.is_file.return_value = False
            mocked['cargar_bass_excel'].return_value = rows
            mocked['generar_excel'].return_value = b'excel-original'

            st.button.side_effect = lambda label, **kw: label == 'Generar Excel con estos resultados'
            ui.mostrar_conciliacion(snapshot, 'test', 'BASS')
            mocked['generar_excel'].assert_called_once()

            # Se corrige una fila (cambia commission_amount): misma pagina, sin apretar ningun boton.
            # Para carriers peninsula la vista previa se recalcula sola (prepare=True siempre).
            corregidas = [dict(rows[0], commission_amount='20')]
            mocked['cargar_bass_excel'].return_value = corregidas
            st.download_button.reset_mock()
            st.button.side_effect = lambda label, **kw: False
            ui.mostrar_conciliacion(snapshot, 'test', 'BASS')
            self.assertEqual(mocked['generar_excel'].call_count, 1)
            st.download_button.assert_not_called()
            st.info.assert_called_with('Los datos cambiaron desde el último Excel generado; genera uno nuevo para reflejarlos.')
