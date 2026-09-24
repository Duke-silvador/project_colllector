"""B?squeda nueva: agente desde Created By del portal visual de Compass."""
import os
import time
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
import requests
import compass
from requests import RequestException
from franquicias import _formatear_codigo_oficina
from busqueda_polizas import _campo, _columnas_agente
from busqueda_polizas_historico import completar_desde_historico_lote

def obtener_created_by_lote(consultas, progreso=None):
    base = os.getenv('COMPASS_BOT_URL', '').strip().rstrip('/')
    key = os.getenv('COMPASS_BOT_API_KEY', '').strip()
    if not base or not key:
        raise ValueError('Configura COMPASS_BOT_URL y COMPASS_BOT_API_KEY.')
    headers = {'Authorization': f'Bearer {key}'}
    job_id = uuid4().hex
    payload = None
    # El mismo ID evita lanzar otro Chrome si se pierde la respuesta de creación.
    for intento in range(5):
        try:
            response = requests.post(base + '/v1/policies/created-by/jobs',
                                     json={'job_id': job_id, 'policies': consultas}, headers=headers, timeout=(5, 20))
            response.raise_for_status()
            payload = response.json()
            break
        except (requests.Timeout, requests.ConnectionError):
            if intento == 4:
                raise
            time.sleep(2)
    while isinstance(payload, dict) and payload.get('status') in ('queued', 'running'):
        if progreso:
            progreso(-2 if payload.get('status') == 'queued' else payload.get('completed', 0), len(consultas))
        time.sleep(2)
        try:
            response = requests.get(base + '/v1/policies/created-by/jobs/' + job_id,
                                    headers=headers, timeout=(5, 20))
            if response.status_code in (502, 503, 504):
                continue
            response.raise_for_status()
            payload = response.json()
        except (requests.Timeout, requests.ConnectionError):
            # Chrome continúa: volver a consultar el mismo trabajo, sin reenviarlo.
            if progreso:
                progreso(-1, len(consultas))
            continue
    if not isinstance(payload, dict) or payload.get('job_id') != job_id:
        raise ValueError('Compass Bot devolvió otro trabajo o un estado inválido.')
    if payload.get('status') == 'failed':
        partial = {r['request_id']: r for r in payload.get('policies', [])}
        payload['policies'] = [partial.get(p['request_id'], {**p, 'error': payload.get('error') or 'created_by_job_failed'}) for p in consultas]
    elif payload.get('status') != 'completed':
        raise ValueError('Compass Bot devolvió un estado inválido.')
    rows = payload.get('policies') if isinstance(payload, dict) else None
    expected = {p['request_id']: p for p in consultas}
    seen = set()
    if not isinstance(rows, list) or len(rows) != len(consultas):
        raise ValueError('Compass Bot devolvió un lote incompleto.')
    for row in rows:
        if not isinstance(row, dict) or row.get('request_id') not in expected or row['request_id'] in seen:
            raise ValueError('Compass Bot devolvió identidades inesperadas.')
        source = expected[row['request_id']]
        if any(row.get(k) != source.get(k) for k in ('policy_number', 'office_number', 'office_id', 'effective_date')):
            raise ValueError('Compass Bot devolvió otra póliza u oficina.')
        if not row.get('error') and not isinstance(row.get('created_by'), str):
            raise ValueError('Compass Bot devolvió un resultado visual inválido.')
        seen.add(row['request_id'])
    return rows


def consultar_polizas_visual(filas, oficinas, token, progreso=None, actualizar=None, estado=None, tamano_lote=10, anteriores=None):
    """Resuelve API, Created By y agente en lotes antes de avanzar al siguiente."""
    if tamano_lote < 1:
        raise ValueError('El tamaño del lote debe ser mayor que cero.')
    resultados = [dict(r) for r in (anteriores or [])]
    if len(resultados) > len(filas) or any((r.get('Fila Excel'), r.get('Póliza')) != filas[i]
                                          for i, r in enumerate(resultados)):
        raise ValueError('Los resultados previos no corresponden al archivo seleccionado.')
    cache = {r['Póliza']: r for r in resultados}
    agentes_cache = {}
    token_state = [token]
    for inicio in range(len(resultados), len(filas), tamano_lote):
        lote = filas[inicio:inicio + tamano_lote]
        nuevas = list(dict.fromkeys(numero for _, numero in lote if numero not in cache))
        if nuevas:
            if estado:
                estado('api', inicio, len(filas))
            resueltas = _consultar_lote([(None, numero) for numero in nuevas], oficinas, token,
                                       agentes_cache=agentes_cache,
                                       estado=(lambda fase: estado(fase, inicio, len(filas))) if estado else None,
                                       token_state=token_state)
            cache.update(zip(nuevas, resueltas))
        resultados.extend({**cache[numero], 'Fila Excel': fila} for fila, numero in lote)
        columnas = list(dict.fromkeys(k for row in resultados for k in row))
        snapshot = [{k: row.get(k, '') for k in columnas} for row in resultados]
        if actualizar:
            actualizar(snapshot)
        if progreso:
            progreso(len(resultados), len(filas))
    columnas = list(dict.fromkeys(k for row in resultados for k in row))
    return [{k: row.get(k, '') for k in columnas} for row in resultados]


def _consulta_api(funcion, token_state, valor):
    for intento in range(3):
        try:
            return funcion(token_state[0], valor)
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 401 and intento < 2:
                token_state[0] = compass.obtener_token()
                continue
            if exc.response is None or exc.response.status_code < 500 or intento == 2:
                raise
        except (requests.Timeout, requests.ConnectionError):
            if intento == 2:
                raise
        time.sleep(2)


def _consultar_lote(filas, oficinas, token, progreso=None, *, agentes_cache=None, estado=None, token_state=None):
    if token_state is None:
        token_state = [token]
    rows = _consultar_base(filas, oficinas, token, progreso, token_state=token_state)
    pendientes = [i for i, row in enumerate(rows)
                  if row.get('Resultado') == 'Póliza no encontrada' and row.get('Póliza')]
    # El histórico usa otra conexión; Selenium sigue en su único navegador.
    if pendientes:
        if estado:
            estado('historico')
        with ThreadPoolExecutor(max_workers=1, thread_name_prefix='policy-history') as executor:
            historico = executor.submit(completar_desde_historico_lote, [rows[i] for i in pendientes])
            rows = _enriquecer_visual(rows, oficinas, token_state, agentes_cache, estado)
            try:
                recuperadas = historico.result()
            except Exception:
                # Una caída del histórico no descarta el lote ni detiene Compass.
                for i in pendientes:
                    rows[i]['Resultado histórico'] = 'Error al consultar histórico; vuelve a intentar'
            else:
                for i, recuperada in zip(pendientes, recuperadas):
                    rows[i].update({k: v for k, v in recuperada.items() if not k.startswith('_')})
    else:
        rows = _enriquecer_visual(rows, oficinas, token_state, agentes_cache, estado)
    for row in rows:
        row.setdefault('Origen datos', 'Compass' if row.get('Office ID') else '')
    columnas = list(dict.fromkeys(k for row in rows for k in row))
    return [{k: row.get(k, '') for k in columnas} for row in rows]


def _enriquecer_visual(rows, oficinas, token_state, agentes_cache, estado):
    mapa = {str(o['office_id']).strip(): o for o in oficinas}
    consultas, indices = [], {}
    for i, row in enumerate(rows):
        office = mapa.get(row['Office ID'])
        if not office or not row['Número oficina']:
            row['Resultado agente'] = 'Sin oficina para consulta visual'
            continue
        identity = (row['Póliza'], row['Office ID'], row['Vigencia desde'], row.get('_policy_id'))
        if identity not in indices:
            indices[identity] = str(i)
            consultas.append(dict(request_id=str(i), policy_number=row['Póliza'],
                                  office_number=str(int(office['office_number'])), office_id=row['Office ID']))
        row['_request_id'] = indices[identity]
    visuales = {}
    # Reduce cambios de oficina dentro del lote sin cambiar el orden de la tabla.
    consultas.sort(key=lambda p: (p['office_id'], p['office_number']))
    if consultas and estado:
        estado('visual')
    for inicio in range(0, len(consultas), 2000):
        lote = consultas[inicio:inicio + 2000]
        try:
            if estado:
                resultados_visuales = obtener_created_by_lote(lote, progreso=lambda n, total: estado(f'visual:{n}:{total}'))
            else:
                resultados_visuales = obtener_created_by_lote(lote)
            visuales.update({r['request_id']: r for r in resultados_visuales})
        except (RequestException, ValueError, TypeError, KeyError):
            visuales.update({p['request_id']: {'error': 'Error al consultar Created By en Compass'} for p in lote})
    if agentes_cache is None:
        agentes_cache = {}
    if estado:
        estado('agentes')
    for row in rows:
        visual = visuales.get(row.pop('_request_id', None))
        row.pop('_policy_id', None)
        if visual is None:
            continue
        if visual.get('error'):
            row['Resultado agente'] = visual['error']
            continue
        nombre = visual['created_by'].strip()
        row['Nombre agente'] = nombre
        if not nombre:
            row['Resultado agente'] = 'Created By vacío en Compass'
            continue
        office_id = row['Office ID']
        if office_id not in agentes_cache:
            try:
                agentes_cache[office_id] = _consulta_api(compass.obtener_agentes_oficina, token_state, office_id)
            except (RequestException, ValueError, TypeError, KeyError):
                agentes_cache[office_id] = None
        agentes = agentes_cache[office_id]
        if agentes is None:
            row['Resultado agente'] = 'Error al consultar agentes de Compass; vuelve a intentar'
            continue
        matches = [a for a in agentes if _nombre_agente(a) == nombre]
        if len(matches) != 1:
            row['Resultado agente'] = 'Nombre de agente duplicado en la oficina' if matches else 'Agente no encontrado en la oficina'
            continue
        agente = matches[0]
        row.update({'ID agente': _campo(agente, 'userid', 'agentid', 'id'),
                    'Correo agente': _campo(agente, 'email', 'emailaddress', 'agentemail'),
                    'Teléfono agente': _campo(agente, 'phone', 'phonenumber', 'telephone', 'mobile', 'cellphone'),
                    'Estado agente': _campo(agente, 'status', 'statusid', 'agentstatus'),
                    'Licencia 220 agente': _campo(agente, 'agentlicence220number', 'agentlicense220number', 'license220number'),
                    'NPN agente': _campo(agente, 'agent220npn', 'agent220npnnumber', 'npn'),
                    'Resultado agente': 'Encontrado'})
        row.update(_columnas_agente(agente))
    columnas = list(dict.fromkeys(k for row in rows for k in row))
    return [{k: row.get(k, '') for k in columnas} for row in rows]


def _nombre_agente(agente):
    return _campo(agente, 'agentname', 'name', 'fullname') or ' '.join(filter(None, [
        _campo(agente, 'firstname'), _campo(agente, 'lastname')]))


def _consultar_base(filas, oficinas, token, progreso=None, *, token_state=None):
    if token_state is None:
        token_state = [token]
    mapa = {str(o["office_id"]).strip(): o for o in oficinas}
    cache = {}
    resultados = []
    for i, (fila, numero) in enumerate(filas, 1):
        row = {"Fila Excel": fila, "Póliza": numero, "Estado póliza": "",
               "Office ID": "", "Número oficina": "", "Oficina": "",
               "Vigencia desde": "", "Fecha expiración": "", "Resultado": "",
               "Nombre franquicia Compass": "", "ID agente": "", "Nombre agente": "",
               "Correo agente": "", "Teléfono agente": "", "Estado agente": "",
               "Licencia 220 agente": "", "NPN agente": "", "Resultado agente": ""}
        if not numero:
            row["Resultado"] = "Sin número de póliza"
        else:
            if numero not in cache:
                try:
                    cache[numero] = (_consulta_api(compass.buscar_poliza, token_state, numero), None)
                except (RequestException, ValueError, TypeError, KeyError):
                    cache[numero] = (None, "Error al consultar Compass; vuelve a intentar")
            poliza, error = cache[numero]
            if error:
                row["Resultado"] = error
            elif poliza is None:
                row["Resultado"] = "Póliza no encontrada"
            else:
                office_id = str(poliza.get("office_id") or "").strip()
                oficina = mapa.get(office_id)
                row.update({"Estado póliza": str(poliza.get("status_id") or "Sin estado"),
                            "Office ID": office_id,
                            "Vigencia desde": str(poliza.get("effective_date") or ""),
                            "Fecha expiración": _campo(poliza, "expirationdate", "expirydate", "expiration", "expiry"),
                            "Número oficina": (_formatear_codigo_oficina(oficina.get("office_number")) or "") if oficina else "",
                            "Oficina": str(oficina.get("office_name") or "") if oficina else "",
                            "Resultado": "Encontrada" if oficina else "Oficina sin coincidencia"})
                row["Nombre franquicia Compass"] = row["Oficina"]
                row["_policy_id"] = str(poliza.get("id") or poliza.get("policy_id") or "")
        resultados.append(row)
        if progreso:
            progreso(i, len(filas))
    # Todas las filas comparten columnas, incluso si la primera póliza no tiene agente.
    columnas = list(dict.fromkeys(k for row in resultados for k in row))
    return [{k: row.get(k, "") for k in columnas} for row in resultados]


