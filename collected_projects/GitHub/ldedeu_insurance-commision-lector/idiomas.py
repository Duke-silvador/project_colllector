import streamlit as st
from functools import wraps

def texto(es, en):
    return en if st.session_state.get('language') == 'English' else es


_PAIRS = '''
Procesar statements|Process statements
Carga de archivos por carrier|Upload carrier files
Selecciona un carrier arriba para comenzar.|Select a carrier above to begin.
Selecciona un carrier|Select a carrier
Mes contable|Accounting month
Cargar archivos → Preparar registros → Revisar información → Importar|Upload files → Prepare records → Review information → Import
Indica el mes contable en formato YYYY-MM.|Enter the accounting month as YYYY-MM.
Indica el mes contable en formato YYYY-MM para preparar la importación.|Enter the accounting month as YYYY-MM to prepare the import.
Prepara y revisa la información de tus reportes antes de importarla.|Prepare and review your reports before importing them.
Arrastra tus archivos o selecciónalos|Drop your files or browse
Excel moderno o PDF con texto. Máximo 20 MB por archivo.|Modern Excel or text PDF. Maximum 20 MB per file.
Carrier seleccionado|Selected carrier
Archivos cargados|Uploaded files
En preparación|Preparing
Sin archivos|No files
Selecciona un carrier y carga un Excel o PDF para comenzar.|Select a carrier and upload an Excel or PDF to begin.
Este archivo supera el límite de 20 MB.|This file exceeds the 20 MB limit.
Procesar PDF Commonwealth|Process Commonwealth PDF
Preparar registros|Prepare records
Revisar información|Review information
Importar a MySQL|Import into MySQL
Asociar columnas del archivo|Map file columns
Archivo importado correctamente en esta sesión.|File successfully imported in this session.
Se comparan los registros del archivo y mes contable. Solo se insertan los faltantes; si todos existen, se continúa con la conciliación.|Records are compared by file and accounting month. Only missing records are inserted; if all exist, bank reconciliation continues.
Esta importación se realizó antes de habilitar la conciliación y no tiene una copia de los registros en esta sesión.|This import predates reconciliation and has no record snapshot in this session.
El archivo supera el límite de 20 MB.|The file exceeds the 20 MB limit.
El fichero supera el límite de 20 MB.|The file exceeds the 20 MB limit.
Statement de comisiones|Commission statement
FPI → Florida Peninsula; EDI → Edison; OVH → Ovation Home. Las demás hojas se omiten.|FPI → Florida Peninsula; EDI → Edison; OVH → Ovation Home. Other sheets are ignored.
Florida Peninsula, Edison y Ovation Home comparten códigos y tarifas bajo FLORIDA PENINSULA. Franquicia: tabla de códigos; si falta el código, Compass y luego histórico si no aparece la póliza. Comisión de franquicia: commission_rates de FLORIDA PENINSULA, sin porcentajes del histórico. Tipo y porcentaje Del Toro: del statement cuando vienen informados.|Florida Peninsula, Edison and Ovation Home share codes and rates under FLORIDA PENINSULA. Franchise: code table; if the code is missing, Compass, then history if the policy is not found. Franchise commission: FLORIDA PENINSULA commission_rates, without historical rates. Type and Del Toro rate: from the statement when provided.
Prima: sumtier · Comisión Del Toro: sumauth · Tipo: transtype · Rate Del Toro: commissionpercent|Premium: sumtier · Del Toro commission: sumauth · Type: transtype · Del Toro rate: commissionpercent
Revisé los registros y confirmo la importación.|I reviewed the records and confirm the import.
Importar faltantes y continuar|Import missing records and continue
Consultando franquicias y guardando el statement…|Resolving franchises and saving the statement…
Resultados del statement y tabla de códigos|Statement and code table results
Resultado de Compass e histórico|Compass and history results
No hay pólizas para consultar. Los cargos sin número de póliza no consultan Compass.|There are no policies to query. Charges without a policy number do not query Compass.
NEW_BUSINESS = negocio nuevo; RENEWAL = renovación. Los cargos sin póliza no se incluyen.|NEW_BUSINESS = new business; RENEWAL = renewal. Charges without a policy are excluded.
No se pudo resolver la franquicia por código en estos registros. La tabla indica el motivo de cada caso; se consultó Compass como alternativa.|The franchise could not be resolved by code for these records. The table shows the reason for each case; Compass was queried as a fallback.
Conciliar con el banco|Reconcile with the bank
Esta importación no tiene un Grand Total PDF disponible para conciliar.|This import has no PDF Grand Total available for reconciliation.
Statement del banco|Bank statement
El statement supera el límite de 20 MB.|The statement exceeds the 20 MB limit.
Hoja del banco|Bank sheet
Fila de encabezados del banco|Bank header row
Transacciones bancarias a sumar|Bank transactions to sum
El importe bancario seleccionado debe coincidir exactamente con el total del reporte para generar el Excel.|The selected bank amount must exactly match the report total to generate the Excel.
Transacción bancaria a conciliar|Bank transaction to reconcile
Suma de las transacciones seleccionadas|Sum of selected transactions
Hay varias coincidencias exactas. Selecciona la transacción correspondiente.|There are multiple exact matches. Select the correct transaction.
Consultar Compass|Query Compass
Preparando resultados y comisiones…|Preparing results and commissions…
Consultando tipos en Chrome y calculando comisiones…|Querying types in Chrome and calculating commissions…
Consulta Compass para revisar el resultado por póliza antes de generar el Excel.|Query Compass to review each policy result before generating the Excel.
Generar Excel con estos resultados|Generate Excel with these results
Descargar Excel conciliado|Download reconciled Excel
No se pudo conectar con Compass; las franquicias sin resolver quedarán vacías y marcadas en rojo.|Could not connect to Compass; unresolved franchises will be empty and highlighted in red.
Conciliación exacta. Difference: 0.00|Exact reconciliation. Difference: 0.00
Buscar pólizas en Compass|Find policies in Compass
Busca por número de póliza o carga un Excel para consultar su estado y oficina.|Search by policy number or upload an Excel to query status and office.
Se cruza el Office ID con la tabla de oficinas. Para renovaciones se prioriza una póliza activa; si no hay ninguna, la vigencia más reciente.|The Office ID is matched against the office table. For renewals an active policy is preferred; otherwise the latest effective date.
Tipo de búsqueda|Search type
Número de póliza|Policy number
Archivo Excel|Excel file
Escribe el número completo|Enter the full number
Buscar póliza|Find policy
Buscando en Compass…|Searching Compass…
No se pudo iniciar la búsqueda. Revisa la conexión y configuración de Compass y MySQL.|Could not start the search. Check Compass and MySQL connectivity and configuration.
Resultado|Result
Descargar Excel|Download Excel
Excel de pólizas|Policy Excel
Columna del número de póliza|Policy number column
No hay encabezados en esa fila.|There are no headers in that row.
No se pudo leer el Excel. Revisa el archivo, la hoja y la fila de encabezados.|Could not read the Excel. Check the file, sheet and header row.
La hoja no contiene registros debajo del encabezado.|The sheet contains no records below the header.
Buscar todas las pólizas|Find all policies
Buscar y filtrar resultados|Search and filter results
Validar pólizas|Validate policies
Carga un Excel: la primera hoja debe ser Compass y todas las demás, producción. Puedes incluir todos los meses y franquicias.|Upload an Excel: the first sheet must be Compass and the others production. All months and franchises can be included.
Número de la fila donde están los títulos de las columnas.|Row number containing the column headers.
Importar histórico de comisiones|Import commission history
Importar histórico|Import history
Lectura numérica: paréntesis como negativos y redondeo a cinco decimales.|Numeric reading: parentheses indicate negative values and rounding to five decimal places.
Importación a historic_data_commissions por lotes. Se omiten registros ya existentes y duplicados del Excel; los nuevos se confirman al finalizar.|Batch import into historic_data_commissions. Existing records and Excel duplicates are skipped; new records are committed at completion.
Office → franchise. Notes se omite. Difference e ID los genera MySQL. Los campos sin origen quedan NULL. Los porcentajes se conservan tal como están almacenados en Excel.|Office → franchise. Notes are omitted. MySQL generates Difference and ID. Fields without a source remain NULL. Rates are preserved as stored in Excel.
Registros nuevos|New records
Duplicados omitidos|Skipped duplicates
Importación completa y confirmada en MySQL.|Import completed and committed in MySQL.
Resultado del último intento. Para aplicar las correcciones, inicia una nueva importación abajo.|Last attempt result. Start a new import below to apply corrections.
No reintentes sin verificar la tabla si se perdió la conexión durante la confirmación final.|If the connection was lost during final commit, verify the table before retrying.
El proceso ya no está disponible. Verifica la tabla antes de iniciar otra carga.|The process is no longer available. Check the table before starting another upload.
Confirmando la transacción…|Committing the transaction…
Procesando en segundo plano. Los lotes aún no están confirmados.|Processing in the background. Batches have not been committed yet.
Puedes mantener esta página abierta; no detengas el servidor durante la carga.|You can keep this page open; do not stop the server during the upload.
Excel histórico|History Excel
Registros por lote|Records per batch
Confirmo importar únicamente los registros que no existen.|I confirm importing only missing records.
Comisiones por estado, carrier, tipo de transacción y línea de negocio|Commissions by state, carrier, transaction type and business line
Escribe las tasas en decimal: 0.12 = 12%, 0.08 = 8%, 0.12058 = 12.058%. Escribe 0.12 para doce por ciento; 12 significa 1200%. Los valores se guardan sin dividir entre 100.|Enter decimal rates: 0.12 = 12%, 0.08 = 8%, 0.12058 = 12.058%. Enter 0.12 for twelve percent; 12 means 1200%. Values are saved without dividing by 100.
Cada combinación única de estado, carrier, tipo de transacción y línea de negocio tiene una sola comisión vigente, con dos porcentajes: Franchise % (lo que recibe el franchise) y Del Toro % (lo que recibe Del Toro del carrier). Margin es la diferencia entre ambos y solo se muestra, no se guarda. Crear o editar una comisión queda registrado en su histórico de cambios.|Each unique state, carrier, transaction type and business line combination has one current commission, with Franchise % (paid to the franchise) and Del Toro % (received from the carrier). Margin is their difference, displayed but not stored. Creating or editing a commission is recorded in its change history.
Tipos de transacción|Transaction types
Nuevo tipo de transacción|New transaction type
Ej.: Endorse|E.g.: Endorse
Añadir tipo|Add type
Tipo añadido. Ya está disponible para configurar su comisión.|Type added. It is available to configure its commission.
↻ Actualizar tipos|↻ Refresh types
Vuelve a leer los tipos disponibles y actualiza los selectores.|Reload available types and update the selectors.
Crear nueva comisión|Create new commission
Selecciona un estado|Select a state
Tipo de transacción|Transaction type
Selecciona un tipo|Select a type
Línea de negocio|Business line
Déjalo vacío si no aplica|Leave empty if not applicable
Ej.: 0.12|E.g.: 0.12
Creado por|Created by
Crear comisión|Create commission
Selecciona estado, carrier y tipo de transacción.|Select state, carrier and transaction type.
Renewal y una línea de negocio específica no se combinan. Elige Renewal dejando la línea de negocio vacía, o New Business con la línea de negocio.|Renewal cannot be combined with a specific business line. Select Renewal with an empty business line, or New Business with a business line.
Comisión creada correctamente.|Commission created successfully.
Editar una comisión|Edit a commission
Selecciona la comisión a editar|Select the commission to edit
Nuevo Franchise (decimal)|New Franchise (decimal)
Nuevo Del Toro (decimal)|New Del Toro (decimal)
0.12 equivale a 12%. Se conserva el decimal escrito.|0.12 means 12%. The entered decimal is preserved.
Editado por|Edited by
Actualizar comisión|Update commission
Comisión actualizada correctamente.|Commission updated successfully.
Ver histórico de cambios de esta comisión|View this commission's change history
Sin cambios registrados todavía.|No changes recorded yet.
Hay comisiones donde Del Toro % es menor que Franchise % (Margin negativo). Revísalas.|Some commissions have Del Toro % lower than Franchise % (negative margin). Review them.
Importar códigos de franquicias|Import franchise codes
Consultar agentes en Compass|Query agents in Compass
Buscar oficinas en la base de datos|Find offices in the database
Importar códigos a MySQL|Import codes into MySQL
Todos como master|All as master
Buscar en|Search in
Buscar en la tabla|Search the table
Buscar en la tabla…|Search the table…
Buscar por valor en la tabla|Search by table value
Todos los campos|All fields
Todos|All
Sí|Yes
No|No
Sin Office ID: no se consultó Compass|No Office ID: Compass was not queried
Sin agentes activos|No active agents
Hoja|Sheet
Fila de encabezados|Header row
Filas por página|Rows per page
Página|Page
Campo|Field
Estado|State
Póliza|Policy
Código|Code
Franquicia|Franchise
Oficina|Office
Alerta|Alert
Franquicia en Compass|Franchise in Compass
Oficina en Compass|Office in Compass
No encontrada|Not found
Se obtuvo del histórico|Retrieved from history
Se obtuvo del statement|Retrieved from statement
Tabla de códigos|Code table
Pendiente|Pending
Tipo obtenido|Type retrieved
No se obtuvo el tipo|Type not retrieved
Fuente franquicia|Franchise source
Fuente tipo|Type source
Origen franquicia|Franchise origin
Tipo en Compass|Type in Compass
Tipo en statement|Type in statement
Tipo en histórico|Type in history
Detalle|Details
Alerta código|Code alert
Agente|Agent
Tipo|Type
Franquicia anterior|Previous franchise
Nombre del Excel|Excel name
Diferencias|Differences
Actualizado por|Updated by
Actualizado|Updated
**Identificación**|**Identification**
**Contacto y dirección**|**Contact and address**
**Administración**|**Administration**
'''
TRADUCCIONES = dict(line.split('|', 1) for line in _PAIRS.strip().splitlines())
TRADUCCIONES.update(dict(line.split('|', 1) for line in '''
Comisiones vigentes|Current commissions
Comparando Compass con todas las hojas de producción…|Comparing Compass with all production sheets…
Conectando con Compass y cargando oficinas…|Connecting to Compass and loading offices…
Consultando agentes por Office UID…|Querying agents by Office UID…
Descargar Excel validado con reporte|Download validated Excel with report
Descargar reporte de validación (JSON)|Download validation report (JSON)
Descargar vista previa CSV|Download CSV preview
Detalle de MySQL|MySQL details
Detalle del error|Error details
El Excel incluye una hoja final con el reporte completo, independientemente de los filtros de pantalla.|The Excel includes a final sheet with the full report, regardless of screen filters.
El archivo supera el límite de 500 MB.|The file exceeds the 500 MB limit.
El nombre de cada hoja empieza con el estado (código de 2 letras como 'TX' o nombre completo como 'Texas'), seguido opcionalmente de modificadores separados por '_' o '-', pero de un solo tipo: 'RN' marca Renewal, o una o más líneas de negocio conocidas (ej. 'TEXAS-MC', 'TEXAS_R-MC-CV' aplica a las líneas R, MC y CV). RN y una línea de negocio no se combinan en la misma hoja. Sin ninguna línea de negocio en el nombre ('TEXAS' solo), la hoja es una comisión general. Cada fila trae Carrier, Franchise% y DelToro% (ya como fracción, 0.08 equivale a 8%). Se crean las comisiones que falten y se actualizan las que cambien; las que ya coincidan no se tocan.|Each sheet name starts with a state (two-letter code such as TX or full name such as Texas), optionally followed by modifiers separated by underscores or hyphens: RN indicates Renewal, or one or more known business lines (e.g. TEXAS-MC or TEXAS_R-MC-CV). RN and a business line cannot be combined in one sheet. A state alone indicates a general commission. Each row contains Carrier, Franchise% and DelToro% as fractions (0.08 means 8%). Missing commissions are created, changed commissions are updated and identical commissions are preserved.
El procesamiento falló. Este mensaje no significa que el archivo esté dañado.|Processing failed. This does not mean the file is damaged.
Encontradas|Found
Escribe el número de póliza, LOB, hoja u otro valor y pulsa Enter|Enter a policy number, LOB, sheet or other value and press Enter
Este carrier está disponible en el catálogo. Sus reglas de procesamiento están pendientes de configurar.|This carrier is in the catalog. Its processing rules have not been configured yet.
Excel con Compass y hojas de producción|Excel with Compass and production sheets
Excel de códigos|Code Excel
Filas de Compass|Compass rows
Filas de encabezados|Header rows
Filas marcadas en rojo|Rows highlighted in red
Filtrar por carrier|Filter by carrier
Filtrar por estado|Filter by state
Filtrar por línea de negocio|Filter by business line
Filtrar por tipo|Filter by type
Formato numérico válido. Revisa también pólizas, fechas y códigos antes de importar.|Valid numeric format. Also review policies, dates and codes before importing.
Franchise Name se conserva del Excel. El nombre Soffront y el estado se obtienen de offices.|Franchise Name is preserved from Excel. Soffront name and state are retrieved from offices.
Hasta 500 MB. Validación en lotes de 5.000 filas.|Up to 500 MB. Validation in batches of 5,000 rows.
Importado por|Imported by
Importando registros…|Importing records…
Importar Excel de comisiones|Import commission Excel
Importar comisiones|Import commissions
Importar códigos por franquicia|Import codes by franchise
La aplicación puede conservar una versión anterior del procesador. Detén Streamlit con Ctrl+C, vuelve a iniciarlo y procesa el PDF otra vez.|The app may retain an older processor version. Stop Streamlit with Ctrl+C, restart it and process the PDF again.
La columna Registro corresponde al número indicado en las observaciones; se renumera al agregar o eliminar filas.|The Record column corresponds to the number in the notes; it is renumbered when rows are added or removed.
La hoja principal no contiene filas de datos.|The main sheet has no data rows.
Los campos sin columna quedan vacíos; mes contable toma el valor de la barra lateral. Conserva los códigos como texto en Excel para mantener ceros iniciales.|Fields without a column remain empty; the accounting month uses the selected value. Keep codes as text in Excel to preserve leading zeros.
Los códigos se guardan como FLORIDA PENINSULA y se comparten con Edison y Ovation Home.|Codes are saved under FLORIDA PENINSULA and shared with Edison and Ovation Home.
Los nombres de los meses pueden variar. Por ahora se valida la presencia de la póliza, sin comparar fechas. Conserva los números con ceros iniciales como texto en Excel.|Month names may vary. Currently policy presence is checked without comparing dates. Keep numbers with leading zeros as text in Excel.
Marca la confirmación de revisión para habilitar la importación.|Confirm your review to enable importing.
Marca o desmarca todas las filas, incluidas las ocultas por los filtros.|Select or clear all rows, including those hidden by filters.
Mostrar filas|Show rows
No hay comisiones que coincidan con el filtro. Crea una nueva arriba.|No commissions match the filter. Create one above.
No hay memoria suficiente para procesar este Excel conservando sus formatos.|Not enough memory to process this Excel while preserving formatting.
No se consultó Compass para las siguientes franquicias porque no tienen Office ID:|Compass was not queried for the following franchises because they have no Office ID:
No se encontró texto. Si el PDF está escaneado, requiere OCR, aún no disponible.|No text was found. Scanned PDFs require OCR, which is not available yet.
No se pudieron leer los nombres de las hojas. Pulsa Validar pólizas para guardar el reporte del error.|Could not read sheet names. Click Validate policies to save the error report.
No se pudo cargar el catálogo de carriers. Revisa config/carriers.json.|Could not load the carrier catalog. Check config/carriers.json.
No se pudo cargar el catálogo de líneas de negocio. Revisa config/business_lines.json.|Could not load the business line catalog. Check config/business_lines.json.
No se pudo cargar el catálogo. Revisa config/carriers.json: debe contener una lista bank_carriers con nombres únicos.|Could not load the catalog. Check config/carriers.json: it must contain a bank_carriers list with unique names.
No se pudo guardar el reporte en disco. Puedes descargarlo aquí.|Could not save the report to disk. You can download it here.
Para Carrier que contenga United: UAO000704127 se busca como LOB = UAO y Policy = 704127 en la misma fila de producción. También se acepta el encabezado Police.|For carriers containing United: UAO000704127 is searched as LOB = UAO and Policy = 704127 in the same production row. The Police header is also accepted.
Preparar vista previa|Prepare preview
Puedes corregir celdas, agregar o eliminar filas. El porcentaje se calcula como Commission / Premium (0.12 equivale a 12%); para Chargebacks siempre es 1.|You can edit cells, add or remove rows. The rate is calculated as Commission / Premium (0.12 means 12%); it is always 1 for Chargebacks.
Página anterior|Previous page
Página de resultados|Results page
Página siguiente|Next page
Resultados|Results
Revisa las filas marcadas en rojo. También se marcan las filas sin Policy Number.|Review rows highlighted in red. Rows without Policy Number are also highlighted.
Revisar registros|Review records
Revisé los registros, incluidos los chargebacks, y confirmo la importación.|I reviewed the records, including chargebacks, and confirm the import.
Se busca "Policy Number" de la primera hoja en "Policy" de todas las demás. Las filas de Compass que no aparecen en ninguna se marcan en rojo en el Excel descargable.|Policy Number from the first sheet is searched in Policy in every other sheet. Compass rows not found in any sheet are highlighted in red in the downloadable Excel.
Se importan asegurados y cada concepto de Chargebacks, conservando su signo. Los totales solo se usan para comprobar la lectura. El mes contable se toma del input de la barra lateral.|Insured records and each Chargeback item are imported with their original sign. Totals are used only to verify parsing. The accounting month uses the selected input.
Todas las pólizas de Compass aparecen en las hojas de producción.|All Compass policies appear in the production sheets.
Ver causa del error|View error cause
Ver observaciones|View notes
Vista previa|Preview
Vuelve a obtener Office UID, nombre Soffront y estado desde offices. No consulta agentes.|Reload Office UID, Soffront name and state from offices. Does not query agents.
Comisión total del statement: |Total statement commission: 
Total del reporte: |Report total: 
Total bancario seleccionado: |Selected bank total: 
 · Diferencia: | · Difference: 
Archivo descargado: |Downloaded file: 
No se pudo procesar el statement: |Could not process the statement: 
No se pudieron cargar las comisiones del raw: |Could not load raw commissions: 
No se pudo importar: |Could not import: 
No se encontraron transacciones con |No transactions found containing 
 en Description.| in Description.
 registros nuevos; | new records; 
 ya existentes.| already existing.
 registros. | records. 
 registros sin comisiones calculadas; revisa Commission Alert en el Excel.| records have commission alerts; review Commission Alert in the Excel.
Se obtuvo el tipo de |Type retrieved for 
 registros de pólizas.| policy records.
 Revisa los pendientes antes de generar el Excel.| Review pending records before generating the Excel.
Código |Code 
 no existe en la tabla de códigos para FLORIDA PENINSULA| does not exist in the code table for FLORIDA PENINSULA
 ambiguo para FLORIDA PENINSULA: asociado a distintas franquicias | is ambiguous for FLORIDA PENINSULA: associated with different franchises 
 existe para FLORIDA PENINSULA, pero tiene registros sin franquicia asignada| exists for FLORIDA PENINSULA, but some records have no assigned franchise
'''.strip().splitlines()))


TRADUCCIONES.update(dict(line.split('|', 1) for line in '''
Códigos por franquicia|Franchise codes
Carga de carriers|Carrier uploads
Memoria insuficiente durante la validación|Insufficient memory during validation
 códigos corresponden a oficinas sin agentes activos. Se pueden importar con los datos del agente vacíos.| codes belong to offices without active agents. They can be imported with empty agent data.
 códigos existentes tienen diferencias y se omitieron. Los demás se procesaron.| existing codes differ and were skipped. The others were processed.
 filas con el filtro seleccionado.| rows match the selected filter.
 filas de origen. Si cambias la hoja o las asociaciones, vuelve a preparar la vista previa.| source rows. If you change the sheet or mappings, prepare the preview again.
 filas leídas).| rows read).
 observaciones de formato numérico.| numeric format notes.
 pólizas distintas. Los duplicados se consultan una vez y conservan su fila en el resultado.| distinct policies. Duplicates are queried once and retain their result row.
 registros pendientes de oficina o agente. Completa los datos antes de importar.| records pending office or agent data. Complete them before importing.
 sin cambios (de | unchanged (out of 
 ya existentes. Puedes continuar con la conciliación bancaria.| already existing. You can continue with bank reconciliation.
 · Hasta 500 filas por página. La descarga incluye todo el Excel.| · Up to 500 rows per page. The download includes the entire Excel.
 · Nombre sin extensión: | · Name without extension: 
). Revisa conexión, credenciales, file_id y restricciones de la tabla. Si se perdió la conexión al confirmar, verifica la tabla antes de reintentar.|). Check connectivity, credentials, file_id and table constraints. If connectivity was lost during commit, verify the table before retrying.
Archivo con extensión: |File with extension: 
Archivo: |File: 
Fila |Row 
Hojas detectadas: |Detected sheets: 
 · Hojas detectadas: | · Detected sheets: 
 · Destino: | · Destination: 
Importación completada: |Import completed: 
La validación se interrumpió en: |Validation stopped at: 
MySQL rechazó la operación (código |MySQL rejected the operation (code 
Procesadas |Processed 
Página |Page 
Verificación completada: |Verification completed: 
, decimales)|, decimals)
 registros nuevos y | new records and 
 registros nuevos. | new records. 
 ya existentes e idénticos.| already existing and identical.
 registros · Archivo: | records · File: 
 creadas, | created, 
 actualizadas, | updated, 
 filas · | rows · 
Registros|Records
Registro|Record
Importar agente|Import agent
Importar|Import
Franchise anterior (decimal)|Previous Franchise (decimal)
Franchise nuevo (decimal)|New Franchise (decimal)
Del Toro anterior (decimal)|Previous Del Toro (decimal)
Del Toro nuevo (decimal)|New Del Toro (decimal)
Franchise % anterior|Previous Franchise %
Franchise % nuevo|New Franchise %
Del Toro % anterior|Previous Del Toro %
Del Toro % nuevo|New Del Toro %
**Identificación**|**Identification**
**Contacto y dirección**|**Contact and address**
**Administración**|**Administration**
source_row|Source row
franchise|Franchise
franchise_name|Franchise name
carrier|Carrier
code|Code
office_id|Office ID
franchise_soffront_name|Soffront franchise name
state_code|State code
agent_name|Agent name
agent_licence_220_number|Agent license 220
agent_licence_NPN_number|Agent NPN license
agent_lookup_status|Agent lookup status
agent_office_id|Agent office ID
producer_code|Agency code
insured_name|Insured name
policy_number|Policy number
source_sheet|Source sheet
effective_date|Effective date
transaction_type|Transaction type
transaction_type_source|Transaction type source
del_toro_percent|Del Toro rate
premium_amount|Premium
commission_amount|Commission
franchise_number|Franchise code
accounting_month|Accounting month
producer_name|Agency name
policy_status|Policy status
franchise_number_source|Franchise source
'''.strip().splitlines()))


TRADUCCIONES.update({
    'Comisiones y tipos de transacción': 'Commissions and transaction types',
    'Configura tarifas por estado, carrier, tipo y línea de negocio. Los cambios conservan su histórico.': 'Configure rates by state, carrier, type and business line. Changes are recorded in history.',
    'Escribe las tasas en decimal: 0.12 = 12%, 0.08 = 8%, 0.12058 = 12.058%. Los valores se guardan sin dividir entre 100.': 'Enter decimal rates: 0.12 = 12%, 0.08 = 8%, 0.12058 = 12.058%. Values are saved without dividing by 100.',
    'Directorio y edición': 'Directory and editing', 'Nueva comisión': 'New commission',
    'No hay comisiones que coincidan con el filtro. Usa la pestaña Nueva comisión para crear una.': 'No commissions match the filter. Use the New commission tab to create one.',
    '↻ Actualizar': '↻ Refresh', 'Todas': 'All', 'Nombre': 'Name', 'Filtrar tipos': 'Filter types',
    '**Datos de la tarifa**': '**Rate details**', '**Tasas y responsable**': '**Rates and editor**',
})


TRADUCCIONES.update({
    'Nueva búsqueda': 'New search',
    'Continuar búsqueda pendiente': 'Continue pending search',
    'Producer Location ID identifica el código de agencia. Prima y comisión: Premium Collected y Commissions Paid. Fecha: Policy Effective Date.':
        'Producer Location ID identifies the agency code. Premium and commission: Premium Collected and Commissions Paid. Date: Policy Effective Date.',
    'Se lee la primera hoja del Excel, independientemente de su nombre.': 'The first Excel sheet is read, regardless of its name.',
    'La lectura SWYFFT está disponible. La importación y el cálculo de comisiones están pendientes de definir sus reglas.':
        'SWYFFT preview is available. Import and commission calculations are pending definition of their rules.',
    'Buscar pólizas faltantes en histórico': 'Search missing policies in history',
    'Consultando histórico…': 'Searching history…',
    'Si hay varios registros históricos se utiliza el del mes de reporte y fecha de transacción más recientes. Las fechas de vigencia y expiración quedan vacías si no existen en el histórico.':
        'If there are multiple historical records, the most recent report month and transaction date are used. Effective and expiration dates remain blank if unavailable in history.',
    'No se pudo consultar el histórico. Puedes exportar los resultados actuales o volver a intentar.':
        'Could not search history. Export the current results or try again.',
    'Póliza no encontrada en Compass ni histórico': 'Policy not found in Compass or history',
    'Encontrada en histórico': 'Found in history', 'Nombre obtenido del histórico': 'Name retrieved from history',
    'Origen datos': 'Data source', 'Histórico': 'History',
    'Todas las transacciones': 'All transactions',
    'Resultado histórico': 'History result',
    'Error al consultar histórico; vuelve a intentar': 'Error querying history; please retry',
    'Fecha transacción histórico': 'Historical transaction date', 'Mes reporte histórico': 'Historical report month',
    'Mes statement histórico': 'Historical statement month', 'Duración póliza': 'Policy term',
    'Código agencia': 'Agency code', 'Prima': 'Premium', 'Porcentaje Del Toro': 'Del Toro rate',
    'Porcentaje franquicia': 'Franchise rate', 'Comisión Del Toro': 'Del Toro commission',
    'Comisión franquicia': 'Franchise commission',
    'Buscar pólizas por Created By': 'Find policies by Created By',
    'El nombre del agente se lee de Created By en Compass. Sus datos se completan solo cuando hay una única coincidencia de nombre en la oficina.':
        'The agent name is read from Created By in Compass. Agent details are filled only when exactly one agent in the office matches that name.',
    'Sin oficina para consulta visual': 'No office for visual lookup',
    'Error al consultar Created By en Compass': 'Error looking up Created By in Compass',
    'Created By vacío en Compass': 'Created By is empty in Compass',
    'Nombre de agente duplicado en la oficina': 'Duplicate agent name in the office',
    'Fila Excel': 'Excel row', 'Póliza': 'Policy number',
    'Estado póliza': 'Policy status', 'Número oficina': 'Office number',
    'Oficina': 'Office', 'Vigencia desde': 'Effective date',
    'Fecha expiración': 'Expiration date', 'Nombre franquicia Compass': 'Compass franchise name',
    'ID agente': 'Agent ID', 'Nombre agente': 'Agent name',
    'Correo agente': 'Agent email', 'Teléfono agente': 'Agent phone',
    'Estado agente': 'Agent status', 'Licencia 220 agente': 'Agent 220 license',
    'NPN agente': 'Agent NPN', 'Resultado agente': 'Agent lookup result',
    'Agente ·': 'Agent ·', 'Todos los campos': 'All fields',
    'Buscar en resultados': 'Search results', 'Exportar Excel': 'Export Excel',
    'Columnas que quiero exportar': 'Columns to export',
    'La descarga incluye todos los resultados de la búsqueda y solo las columnas seleccionadas.':
        'The download includes all search results and only the selected columns.',
    'Selecciona al menos una columna para descargar el Excel.': 'Select at least one column to download the Excel.',
    'No hay resultados que coincidan con los filtros.': 'No results match the filters.',
    'resultados totales': 'total results', 'Página anterior': 'Previous page',
    'Página siguiente': 'Next page', 'Encontrada': 'Found', 'Encontrado': 'Found',
    'Póliza no encontrada': 'Policy not found', 'Sin número de póliza': 'Missing policy number',
    'Oficina sin coincidencia': 'Office not matched', 'Sin estado': 'No status',
    'Póliza sin ID de agente': 'Policy has no agent ID', 'Póliza sin Office ID': 'Policy has no Office ID',
    'Agente no encontrado en la oficina': 'Agent not found in the office',
    'Agente sin nombre en Compass': 'Agent has no name in Compass',
    'Error al consultar Compass; vuelve a intentar': 'Error querying Compass; try again',
    'Error al consultar agentes de Compass; vuelve a intentar': 'Error querying Compass agents; try again',
    'Busca por número de póliza o carga un Excel para consultar su estado, franquicia y datos del agente.':
        'Search by policy number or upload an Excel to view its status, franchise and agent details.',
    'El nombre de franquicia corresponde al nombre Compass registrado en oficinas. El agente se consulta en Compass por su ID dentro de la oficina; sus datos completos se incluyen en el resultado y el Excel.':
        'The franchise name is the Compass name recorded in the office directory. The agent is looked up in Compass by ID within the office; agent details are included in the results and Excel.',
})


def traducir(value, language=None):
    if not isinstance(value, str) or (language or st.session_state.get('language')) != 'English':
        return value
    if value in TRADUCCIONES:
        return TRADUCCIONES[value]
    for es, en in sorted(TRADUCCIONES.items(), key=lambda pair: len(pair[0]), reverse=True):
        if len(es) > 3 and es in value:
            value = value.replace(es, en)
    return value


class Interfaz:
    """Traduce la presentación sin alterar claves, opciones ni datos devueltos."""
    def __init__(self, target):
        self.target = target

    def __enter__(self):
        self.target.__enter__()
        return self

    def __exit__(self, *args):
        return self.target.__exit__(*args)

    def __getattr__(self, name):
        target = getattr(self.target, name)
        if name in ('session_state', 'fragment', 'cache_data', 'cache_resource', 'stop', 'rerun'):
            return target
        if name in ('sidebar', 'column_config'):
            return Interfaz(target)
        if not callable(target):
            return target
        @wraps(target)
        def call(*args, **kwargs):
            args = list(args)
            if name == 'tabs' and args:
                args[0] = [traducir(label) for label in args[0]]
            elif args and name not in ('columns', 'container', 'form', 'dataframe', 'data_editor', 'progress', 'empty'):
                args[0] = traducir(args[0])
            for key in ('help', 'placeholder', 'page_title', 'label'):
                if key in kwargs:
                    kwargs[key] = traducir(kwargs[key])
            if name in ('selectbox', 'multiselect', 'radio', 'select_slider'):
                formatter = kwargs.get('format_func', str)
                language = st.session_state.get('language', 'Español')
                kwargs['format_func'] = lambda value: traducir(formatter(value), language)
            if name in ('dataframe', 'data_editor') and args and st.session_state.get('language') == 'English':
                data = args[0]
                if name == 'dataframe':
                    if isinstance(data, list) and all(isinstance(row, dict) for row in data):
                        args[0] = [{traducir(k): traducir(v) for k, v in row.items()} for row in data]
                    elif hasattr(data, 'rename'):
                        args[0] = data.rename(columns=traducir)
                if name == 'data_editor' and isinstance(data, list) and data and isinstance(data[0], dict):
                    config = dict(kwargs.get('column_config', {}))
                    for key in data[0]:
                        if key not in config and traducir(key) != key:
                            config[key] = st.column_config.Column(traducir(key))
                    kwargs['column_config'] = config
            result = target(*args, **kwargs)
            if name in ('columns', 'tabs'):
                return [Interfaz(item) for item in result]
            if name in ('container', 'expander', 'empty'):
                return Interfaz(result)
            return result
        return call


interfaz = Interfaz(st)
