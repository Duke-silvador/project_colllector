"""Cliente minimo de la API de Agency Compass (apix.agencycompass.com).

Se usa como respaldo para resolver la franquicia de un registro cuando su
Location no aparece en staging_hub.franchises_carrier_codes: se busca la
poliza por numero y se usa el office_id de Compass tal cual, sin traducirlo
a un codigo propio (la API de Compass no expone esa traduccion).
"""
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent


def _config():
    load_dotenv(ROOT / ".env")
    base_url = os.getenv("COMPASS_API_URL", "").strip().rstrip("/")
    company = os.getenv("COMPASS_COMPANY_ID", "").strip()
    key = os.getenv("COMPASS_API_KEY", "").strip()
    if not base_url or not company or not key:
        raise ValueError("Completa COMPASS_API_URL, COMPASS_COMPANY_ID y COMPASS_API_KEY en .env.")
    return base_url, company, key


def obtener_token():
    """Autentica contra Compass y devuelve el bearer token."""
    base_url, company, key = _config()
    response = requests.post(f"{base_url}/login", json={"company": company, "key": key}, timeout=10)
    response.raise_for_status()
    return response.json()["token"]


def buscar_poliza(token, policy_number):
    """Datos de la poliza en Compass, o None si no existe esa poliza.

    Si Compass devuelve varias polizas para el mismo numero (renovaciones),
    prefiere la que tenga status_id='active'; si ninguna esta activa, usa la
    de effective_date mas reciente.
    """
    base_url, _, _ = _config()
    response = requests.get(
        f"{base_url}/policies",
        params={"policyNumber": policy_number},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    policies = response.json().get("policies", [])
    if not policies:
        return None
    activa = next((p for p in policies if p.get("status_id") == "active"), None)
    elegida = activa or max(policies, key=lambda p: p.get("effective_date") or "")
    return elegida


def buscar_office_id(token, policy_number):
    """Devuelve el office_id conservando la interfaz usada por conciliación."""
    poliza = buscar_poliza(token, policy_number)
    return poliza.get("office_id") if poliza else None


def obtener_agentes_oficina(token, office_id):
    """Consulta agentes; no confunde errores de autorización con oficinas vacías."""
    base_url, _, _ = _config()
    response = requests.get(f'{base_url}/agents', params={'office_id': str(office_id)},
                            headers={'Authorization': f'Bearer {token}'}, timeout=15)
    if response.status_code == 404:
        try:
            payload = response.json()
        except ValueError:
            payload = None
        if isinstance(payload, dict) and payload.get('message') == f'No active agents found for office: {office_id}':
            return []
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict) and payload.get('message') == f'No active agents found for office: {office_id}':
        return []
    agents = payload.get('agents') if isinstance(payload, dict) else payload
    if not isinstance(agents, list) or any(not isinstance(a, dict) for a in agents):
        raise ValueError('Compass devolvió un formato de agentes no reconocido.')
    return agents
