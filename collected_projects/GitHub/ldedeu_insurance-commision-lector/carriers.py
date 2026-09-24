"""Catalogo configurable y reglas de procesamiento por carrier."""

import json
from pathlib import Path


def cargar_carriers():
    path = Path(__file__).resolve().parent / "config" / "carriers.json"
    with path.open(encoding="utf-8") as source:
        names = json.load(source)["bank_carriers"]
    if not isinstance(names, list) or not names:
        raise ValueError("bank_carriers debe ser una lista no vacia.")
    if any(not isinstance(name, str) or not name.strip() for name in names):
        raise ValueError("Cada carrier debe tener un nombre no vacio.")
    names = [name.strip() for name in names]
    if len({name.casefold() for name in names}) != len(names):
        raise ValueError("Hay carriers duplicados en la configuracion.")
    return names

CARRIERS = {
    "BASS": {
        "table": "staging_hub.st_bass_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "GRANADA": {
        "table": "staging_hub.st_granda_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "ASSURANCE": {
        "table": "staging_hub.st_assurance_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "CRC GROUP": {
        "table": "staging_hub.st_crc_group_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "ORCHID": {
        "table": "staging_hub.st_orchid_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "SLIDE": {
        "table": "staging_hub.st_slide_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "SWYFFT": {
        "table": "staging_hub.st_swyfft_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "FLORIDA PENINSULA": {
        "table": "staging_hub.st_florida_peninsula_raw",
        "fields": (),
        "commission_state": "FL",
        "commission_business_line": "",
    },
    "GIC Underwriters": {
        "table": "staging_hub.st_gic_underwriters_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "TOWER HILL": {
        "table": "staging_hub.st_tower_hill_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "THE GENERAL": {
        "table": "staging_hub.st_the_general_raw",
        "fields": (),
        "commission_business_line": "",
    },
    "COMMONWEALTH": {
        "table": "staging_hub.st_commonwealth_raw",
        "fields": (
            "accounting_month", "insured_name", "policy_number", "effective_date",
            "roadside_flag", "premium_amount", "comm_percent", "commission_amount",
            "producer_code", "producer_name", "transaction_type", "policy_status",
        ),
    },
}
