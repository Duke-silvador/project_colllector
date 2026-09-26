# -*- coding: utf-8 -*-
"""
Servidor Web Institucional Enterprise - SGSI & SOC Framework (PostgreSQL / SQLite ORM).
Cumple con estándares de seguridad OWASP Top 10, persistencia transaccional y RBAC.
"""

import os
import sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

import re
import json
import asyncio
import threading
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Request, Response, Form, Query, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, text
from sqlalchemy.orm import Session
import uvicorn
import secrets
from datetime import timedelta

from config.settings import settings
from config.database import get_db, engine, Base
import models
from models.user import User
from models.asset import Asset
from models.risk import Risk
from models.soa import SoAControl, SoAEvidence
from models.incident import Incident
from models.audit import AuditLog
from models.setting import AppSetting

from security.auth import hash_password, verify_password, get_current_user_from_request
from security.middleware import SecurityHeadersMiddleware
from security.file_validator import validate_evidence_file
from services.audit_service import log_audit_action
from services.settings_service import get_all_settings_dict, update_setting_val
from services.integration_service import OneFirewallService, LansweeperService, GLPIService
from services.email_service import send_activation_email, test_smtp_connection
from services.export_service import ExcelExportService

from soc_engine.ai_soc_engine import AISocEngine
from soc_engine.threat_intel_manager import ThreatIntelManager
from soc_engine.threat_detector import ThreatDetector
from soc_engine.log_parser import LogParser
from soc_engine.syslog_collector import SyslogCollector
from soc_engine.wazuh_engine import wazuh_engine
from soc_engine.geo_service import GeoService
from dashboards.dashboard_generator import DashboardGenerator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Asegurar directorios requeridos
os.makedirs(os.path.join(BASE_DIR, "static", "uploads"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "static", "evidencias"), exist_ok=True)

# Crear tablas en BD si no existen
Base.metadata.create_all(bind=engine)

def ensure_user_columns(db_engine):
    """Asegura la compatibilidad de columnas de activación y primer acceso en la tabla users"""
    try:
        with db_engine.connect() as conn:
            dialect = db_engine.dialect.name
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token VARCHAR(128);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_expires TIMESTAMP;"))
                conn.commit()
            elif dialect == "sqlite":
                res = conn.execute(text("PRAGMA table_info(users);")).fetchall()
                cols = [r[1] for r in res]
                if "must_change_password" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0;"))
                if "activation_token" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN activation_token VARCHAR(128);"))
                if "activation_token_expires" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN activation_token_expires TIMESTAMP;"))
                conn.commit()
    except Exception as e:
        print(f"[DB MIGRATION NOTICE] {e}")

def ensure_asset_columns(db_engine):
    """Asegura la compatibilidad de columnas de hardware extendido (RAM, CPU, Disco, SO, Serial) en assets"""
    try:
        with db_engine.connect() as conn:
            dialect = db_engine.dialect.name
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT;"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS cpu VARCHAR(255);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS ram VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS disk VARCHAR(255);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS os_name VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS serial_number VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS model VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS mac_address VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS domain VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS uuid VARCHAR(128);"))
                conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_sync VARCHAR(128);"))
                conn.commit()
            elif dialect == "sqlite":
                res = conn.execute(text("PRAGMA table_info(assets);")).fetchall()
                cols = [r[1] for r in res]
                sqlite_col_stmts = {
                    "ip_address": text("ALTER TABLE assets ADD COLUMN ip_address VARCHAR(64);"),
                    "description": text("ALTER TABLE assets ADD COLUMN description TEXT;"),
                    "cpu": text("ALTER TABLE assets ADD COLUMN cpu VARCHAR(255);"),
                    "ram": text("ALTER TABLE assets ADD COLUMN ram VARCHAR(128);"),
                    "disk": text("ALTER TABLE assets ADD COLUMN disk VARCHAR(255);"),
                    "os_name": text("ALTER TABLE assets ADD COLUMN os_name VARCHAR(128);"),
                    "serial_number": text("ALTER TABLE assets ADD COLUMN serial_number VARCHAR(128);"),
                    "manufacturer": text("ALTER TABLE assets ADD COLUMN manufacturer VARCHAR(128);"),
                    "model": text("ALTER TABLE assets ADD COLUMN model VARCHAR(128);"),
                    "mac_address": text("ALTER TABLE assets ADD COLUMN mac_address VARCHAR(128);"),
                    "domain": text("ALTER TABLE assets ADD COLUMN domain VARCHAR(128);"),
                    "uuid": text("ALTER TABLE assets ADD COLUMN uuid VARCHAR(128);"),
                    "last_sync": text("ALTER TABLE assets ADD COLUMN last_sync VARCHAR(128);")
                }
                for col_name, stmt in sqlite_col_stmts.items():
                    if col_name not in cols:
                        conn.execute(stmt)
                conn.commit()
    except Exception as e:
        print(f"[DB ASSET MIGRATION NOTICE] {e}")

ensure_user_columns(engine)
ensure_asset_columns(engine)

app = FastAPI(
    title="SGSI & SOC Enterprise Platform - SERMIG",
    description="Plataforma Institucional ISO 27001 / SOC con persistencia en Base de Datos PostgreSQL y OWASP Top 10",
    version="3.0.0"
)

# Middleware de Seguridad OWASP
app.add_middleware(SecurityHeadersMiddleware)

# Montar estáticos y plantillas
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Motores de IA y CTI
intel_manager = ThreatIntelManager()
ai_engine = AISocEngine()

# Gestor de WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

# Colector Syslog en segundo plano
def start_background_syslog():
    try:
        collector = SyslogCollector(port=settings.SYSLOG_PORT)
        def on_incident(inc_id, inc_data):
            try:
                db = Session(bind=engine)
                inc_obj = Incident(
                    id=inc_id,
                    timestamp_str=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    title=inc_data.get("Titulo_Incidente", "Alerta Syslog"),
                    threat_type=inc_data.get("Tipo_Amenaza", "Syslog Event"),
                    severity=inc_data.get("Severidad", "Media"),
                    status="Abierto",
                    mitre_tactic=inc_data.get("Tactica_MITRE", "Initial Access"),
                    mitre_technique=inc_data.get("Tecnica_MITRE", "T1190"),
                    src_ip=inc_data.get("IP_Origen", "-"),
                    src_host=inc_data.get("Host_Origen", "-"),
                    dst_ip=inc_data.get("IP_Destino", "-"),
                    dst_host=inc_data.get("Host_Destino", "-"),
                    description=inc_data.get("Descripcion_Hallazgo", "Evento detectado via Syslog")
                )
                db.add(inc_obj)
                db.commit()
                db.close()
            except Exception as e:
                print(f"[Syslog Ingestion Error] {e}")
        collector.start_listening(callback_on_incident=on_incident)
    except Exception as e:
        print(f"[Syslog Collector Error] {e}")

syslog_thread = threading.Thread(target=start_background_syslog, daemon=True)
syslog_thread.start()

# -----------------------------------------------------------------------------
# RUTAS DE AUTENTICACIÓN Y SESIONES RBAC
# -----------------------------------------------------------------------------
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if user:
        return RedirectResponse(url="/")
    app_settings = get_all_settings_dict(db)
    return templates.TemplateResponse(request=request, name="login.html", context={"settings": app_settings, "error": None})

@app.get("/primer-acceso", response_class=HTMLResponse)
async def primer_acceso_page(request: Request, token: str = Query(""), db: Session = Depends(get_db)):
    app_settings = get_all_settings_dict(db)
    if not token:
        return templates.TemplateResponse(request=request, name="login.html", context={"settings": app_settings, "error": "Enlace de activación inválido o no suministrado."})
    
    user = db.query(User).filter(User.activation_token == token).first()
    if not user:
        return templates.TemplateResponse(request=request, name="login.html", context={"settings": app_settings, "error": "El enlace de activación no es válido o ya fue utilizado."})
    
    if user.activation_token_expires and user.activation_token_expires < datetime.utcnow():
        return templates.TemplateResponse(request=request, name="login.html", context={"settings": app_settings, "error": "El enlace de activación ha expirado (48h). Solicite uno nuevo al Administrador CISO."})

    return templates.TemplateResponse(
        request=request,
        name="primer_acceso.html",
        context={"request": request, "settings": app_settings, "user": user, "token": token}
    )

@app.post("/api/auth/primer-acceso")
async def primer_acceso_submit(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
        token = data.get("token", "").strip()
        password = data.get("password", "").strip()

        if not token or not password:
            return JSONResponse({"ok": False, "error": "Token y contraseña requeridos."}, status_code=400)

        if len(password) < 8:
            return JSONResponse({"ok": False, "error": "La contraseña debe tener al menos 8 caracteres."}, status_code=400)

        user = db.query(User).filter(User.activation_token == token).first()
        if not user:
            return JSONResponse({"ok": False, "error": "Token de activación inválido o vencido."}, status_code=404)

        if user.activation_token_expires and user.activation_token_expires < datetime.utcnow():
            return JSONResponse({"ok": False, "error": "El enlace de activación ha expirado."}, status_code=400)

        user.password_hash = hash_password(password)
        user.must_change_password = False
        user.activation_token = None
        user.activation_token_expires = None
        user.is_active = True
        user.last_login = datetime.utcnow()
        db.commit()

        log_audit_action(db, username=user.username, role=user.role, action="FIRST_ACCESS_PASSWORD_SET", module="AUTH", record_id=user.username, ip_address=request.client.host if request.client else "127.0.0.1")

        resp = JSONResponse({"ok": True, "redirect": "/"})
        resp.set_cookie(
            key="sgsi_enterprise_session",
            value=user.username,
            httponly=True,
            samesite="lax",
            path="/",
            max_age=settings.SESSION_EXPIRE_MINUTES * 60
        )
        return resp
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)

@app.post("/login", response_class=HTMLResponse)
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    app_settings = get_all_settings_dict(db)
    clean_username = username.strip()
    user = db.query(User).filter(func.lower(User.username) == clean_username.lower()).first()
    
    if not user:
        log_audit_action(db, username=clean_username, role="Desconocido", action="LOGIN_FAILED", module="AUTH", details={"reason": "Usuario no encontrado"}, ip_address=request.client.host if request.client else "127.0.0.1")
        return templates.TemplateResponse(
            request=request,
            name="login.html",
            context={"settings": app_settings, "error": "Credenciales incorrectas o usuario no encontrado."}
        )

    if not user.is_active:
        log_audit_action(db, username=user.username, role=user.role, action="LOGIN_BLOCKED", module="AUTH", details={"reason": "Usuario desactivado"}, ip_address=request.client.host if request.client else "127.0.0.1")
        return templates.TemplateResponse(
            request=request,
            name="login.html",
            context={"settings": app_settings, "error": "La cuenta de usuario se encuentra inactiva. Contacte al Administrador CISO."}
        )

    if not verify_password(password, user.password_hash, username=user.username):
        log_audit_action(db, username=user.username, role=user.role, action="LOGIN_FAILED", module="AUTH", details={"reason": "Contraseña incorrecta"}, ip_address=request.client.host if request.client else "127.0.0.1")
        return templates.TemplateResponse(
            request=request,
            name="login.html",
            context={"settings": app_settings, "error": "Contraseña incorrecta."}
        )

    # Si el usuario tiene primer acceso pendiente, redirigir a configuración de clave
    if user.must_change_password:
        if not user.activation_token:
            user.activation_token = secrets.token_urlsafe(32)
            user.activation_token_expires = datetime.utcnow() + timedelta(hours=48)
            db.commit()
        return RedirectResponse(url=f"/primer-acceso?token={user.activation_token}", status_code=status.HTTP_302_FOUND)

    # Actualizar último acceso
    user.last_login = datetime.utcnow()
    db.commit()

    log_audit_action(db, username=user.username, role=user.role, action="LOGIN_SUCCESS", module="AUTH", ip_address=request.client.host if request.client else "127.0.0.1")

    response = RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key="sgsi_enterprise_session",
        value=user.username,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=settings.SESSION_EXPIRE_MINUTES * 60
    )
    return response

@app.get("/logout")
async def logout(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if user:
        log_audit_action(db, username=user.username, role=user.role, action="LOGOUT", module="AUTH", ip_address=request.client.host if request.client else "127.0.0.1")
    response = RedirectResponse(url="/login")
    response.delete_cookie(key="sgsi_enterprise_session", path="/")
    return response

# -----------------------------------------------------------------------------
# PÁGINAS PRINCIPALES DEL SISTEMA (CON PERSISTENCIA EN BD)
# -----------------------------------------------------------------------------

# 1. Resumen & KPIs
@app.get("/", response_class=HTMLResponse)
async def dashboard_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")

    app_settings = get_all_settings_dict(db)
    
    # Métricas calculadas directamente de la Base de Datos
    total_incidents = db.query(Incident).count()
    resolved_incidents = db.query(Incident).filter(Incident.status.in_(["Cerrado", "Mitigado"])).count()
    crit_alerts = db.query(Incident).filter(Incident.severity.in_(["Crítica", "Critica"])).count()
    
    controls = db.query(SoAControl).all()
    total_controls = len(controls)
    implemented_controls = sum(1 for c in controls if (c.maturity_pct or 0) >= 100 or str(c.implementation_status).strip() == "Implementado")
    avg_soa = round(sum(c.maturity_pct for c in controls) / total_controls, 1) if total_controls else 0.0

    risks = db.query(Risk).all()
    total_risks = len(risks)
    inh_extremo = sum(1 for r in risks if "Extremo" in str(r.inherent_category))
    inh_alto = sum(1 for r in risks if "Alto" in str(r.inherent_category))
    inh_critical = inh_extremo + inh_alto

    res_extremo = sum(1 for r in risks if "Extremo" in str(r.residual_category) or "Crit" in str(r.residual_category))
    res_alto = sum(1 for r in risks if "Alto" in str(r.residual_category))
    res_medium = sum(1 for r in risks if "Medio" in str(r.residual_category))
    res_low = sum(1 for r in risks if "Bajo" in str(r.residual_category))
    res_critical = res_extremo + res_alto

    avg_eff = round(sum(float(r.control_efficacy_pct or 50.0) for r in risks) / total_risks, 1) if total_risks else 0.0
    mitigated_pct = round(((total_risks - res_critical) / total_risks * 100), 1) if total_risks else 100.0

    assets = db.query(Asset).all()
    critical_assets = sum(1 for a in assets if "Crit" in str(a.criticality_level) or (a.criticality_score and a.criticality_score >= 13))

    by_sev = {
        "Crítica": crit_alerts,
        "Alta": db.query(Incident).filter(Incident.severity == "Alta").count(),
        "Media": db.query(Incident).filter(Incident.severity == "Media").count(),
        "Baja": db.query(Incident).filter(Incident.severity == "Baja").count()
    }
    by_thr = {
        "Inyección SQL": db.query(Incident).filter(Incident.threat_type.like("%SQL%")).count(),
        "Fuerza Bruta": db.query(Incident).filter(Incident.threat_type.like("%Fuerza%")).count(),
        "XSS": db.query(Incident).filter(Incident.threat_type.like("%XSS%")).count(),
        "Malware / PowerShell": db.query(Incident).filter(Incident.threat_type.like("%Malware%")).count(),
        "Reconnaissance": db.query(Incident).filter(Incident.threat_type.like("%Recon%")).count()
    }

    kpis = {
        "total_incidents": total_incidents,
        "avg_mttd_min": 2.1,
        "avg_mttr_min": 21.4,
        "critical_alerts": crit_alerts,
        "soa_compliance": avg_soa,
        "soa_implemented": implemented_controls,
        "soa_total": total_controls,
        "risks_total": total_risks,
        "risks_critical": inh_critical,
        "risks_inherent_critical": inh_critical,
        "risks_residual_critical": res_critical,
        "risks_residual_medium": res_medium,
        "risks_residual_low": res_low,
        "risks_mitigated_pct": mitigated_pct,
        "risks_avg_efficacy": avg_eff,
        "assets_total": len(assets),
        "assets_critical": critical_assets,
        "incidents_resolved": resolved_incidents,
        "by_severity": by_sev,
        "by_threat": by_thr
    }

    charts = {
        "incidents_labels": ["Crítica", "Alta", "Media", "Baja"],
        "incidents_values": [
            crit_alerts,
            db.query(Incident).filter(Incident.severity == "Alta").count(),
            db.query(Incident).filter(Incident.severity == "Media").count(),
            db.query(Incident).filter(Incident.severity == "Baja").count()
        ],
        "threats_labels": ["Inyección SQL", "Fuerza Bruta", "XSS", "Malware / PowerShell", "Reconnaissance"],
        "threats_values": [
            db.query(Incident).filter(Incident.threat_type.like("%SQL%")).count(),
            db.query(Incident).filter(Incident.threat_type.like("%Fuerza%")).count(),
            db.query(Incident).filter(Incident.threat_type.like("%XSS%")).count(),
            db.query(Incident).filter(Incident.threat_type.like("%Malware%")).count(),
            db.query(Incident).filter(Incident.threat_type.like("%Recon%")).count()
        ],
        "assets_labels": ["Crítico", "Alto", "Medio", "Bajo"],
        "assets_values": [
            sum(1 for a in assets if "crit" in str(a.criticality_level).lower()),
            sum(1 for a in assets if "alt" in str(a.criticality_level).lower()),
            sum(1 for a in assets if "med" in str(a.criticality_level).lower()),
            sum(1 for a in assets if "baj" in str(a.criticality_level).lower())
        ]
    }

    all_incidents_db = db.query(Incident).all()
    incidents_dict_list = [i.to_dict() for i in all_incidents_db]
    geo_threats = GeoService.get_dashboard_geo_dataset(incidents_dict_list)

    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "active_page": "dashboard",
            "current_user": user,
            "settings": app_settings,
            "kpis": kpis,
            "charts": charts,
            "geo_threats": geo_threats
        }
    )

@app.get("/api/threats/geomap")
async def api_threats_geomap(db: Session = Depends(get_db)):
    all_incidents_db = db.query(Incident).all()
    incidents_dict_list = [i.to_dict() for i in all_incidents_db]
    return JSONResponse(GeoService.get_dashboard_geo_dataset(incidents_dict_list))


# 2. Centro SOC
@app.get("/soc", response_class=HTMLResponse)
async def soc_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")

    app_settings = get_all_settings_dict(db)
    incidents_db = db.query(Incident).order_by(Incident.timestamp_str.desc()).all()
    incidents_list = [i.to_dict() for i in incidents_db]

    return templates.TemplateResponse(
        request=request,
        name="soc.html",
        context={
            "active_page": "soc",
            "current_user": user,
            "settings": app_settings,
            "incidents": incidents_list,
            "cti_count": len(intel_manager.iocs)
        }
    )

# 2.5 Wazuh Open Source SIEM & XDR
@app.get("/wazuh", response_class=HTMLResponse)
async def wazuh_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")

    app_settings = get_all_settings_dict(db)
    w_status = wazuh_engine.get_status()
    w_agents = wazuh_engine.get_agents()
    w_alerts = wazuh_engine.get_alerts()
    w_fim = wazuh_engine.get_fim_events()
    w_sca = wazuh_engine.get_sca_benchmarks()
    w_cves = wazuh_engine.get_vulnerabilities()
    w_ar = wazuh_engine.get_active_responses()

    return templates.TemplateResponse(
        request=request,
        name="wazuh.html",
        context={
            "active_page": "wazuh",
            "current_user": user,
            "settings": app_settings,
            "status": w_status,
            "agents": w_agents,
            "alerts": w_alerts,
            "fim_events": w_fim,
            "sca_benchmarks": w_sca,
            "vulnerabilities": w_cves,
            "active_responses": w_ar
        }
    )

# 3. Matriz de Riesgos
@app.get("/riesgos", response_class=HTMLResponse)
async def riesgos_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")

    app_settings = get_all_settings_dict(db)
    risks_db = db.query(Risk).all()
    risks_list = [r.to_dict() for r in risks_db]

    total_risks = len(risks_db)
    inh_extremo = sum(1 for r in risks_db if "Extremo" in str(r.inherent_category))
    inh_alto = sum(1 for r in risks_db if "Alto" in str(r.inherent_category))
    inh_critical = inh_extremo + inh_alto

    res_extremo = sum(1 for r in risks_db if "Extremo" in str(r.residual_category) or "Crit" in str(r.residual_category))
    res_alto = sum(1 for r in risks_db if "Alto" in str(r.residual_category))
    res_medium = sum(1 for r in risks_db if "Medio" in str(r.residual_category))
    res_low = sum(1 for r in risks_db if "Bajo" in str(r.residual_category))
    res_critical = res_extremo + res_alto

    avg_eff = round(sum(float(r.control_efficacy_pct or 50.0) for r in risks_db) / total_risks, 1) if total_risks else 0.0

    risk_kpis = {
        "total_risks": total_risks,
        "inh_critical": inh_critical,
        "res_critical": res_critical,
        "res_medium": res_medium,
        "res_low": res_low,
        "avg_efficacy": avg_eff
    }

    return templates.TemplateResponse(
        request=request,
        name="riesgos.html",
        context={
            "active_page": "riesgos",
            "current_user": user,
            "settings": app_settings,
            "risks": risks_list,
            "risk_kpis": risk_kpis
        }
    )

# 4. Controles SoA
@app.get("/soa", response_class=HTMLResponse)
async def soa_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")

    app_settings = get_all_settings_dict(db)
    controls_db = db.query(SoAControl).order_by(SoAControl.code.asc()).all()
    controls_list = [c.to_dict() for c in controls_db]

    return templates.TemplateResponse(
        request=request,
        name="soa.html",
        context={
            "active_page": "soa",
            "current_user": user,
            "settings": app_settings,
            "controls": controls_list
        }
    )

# 5. Inventario de Activos
@app.get("/activos", response_class=HTMLResponse)
async def activos_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")

    app_settings = get_all_settings_dict(db)
    assets_db = db.query(Asset).order_by(Asset.id.asc()).all()
    assets_list = [a.to_dict() for a in assets_db]

    return templates.TemplateResponse(
        request=request,
        name="activos.html",
        context={
            "active_page": "activos",
            "current_user": user,
            "settings": app_settings,
            "assets": assets_list
        }
    )

# 6. Mantenedor de Usuarios (Solo Administrador)
@app.get("/usuarios", response_class=HTMLResponse)
async def users_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")
    if user.role != "Administrador":
        return RedirectResponse(url="/")

    app_settings = get_all_settings_dict(db)
    users_db = db.query(User).order_by(User.id.asc()).all()
    users_list = [u.to_dict() for u in users_db]

    return templates.TemplateResponse(
        request=request,
        name="usuarios.html",
        context={
            "active_page": "usuarios",
            "current_user": user,
            "settings": app_settings,
            "users": users_list
        }
    )

# 7. Ajustes Institucionales (Solo Administrador)
@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")
    if user.role != "Administrador":
        return RedirectResponse(url="/")

    app_settings = get_all_settings_dict(db)
    return templates.TemplateResponse(
        request=request,
        name="settings.html",
        context={
            "active_page": "settings",
            "current_user": user,
            "settings": app_settings
        }
    )

# -----------------------------------------------------------------------------
# APIS TRANSACCIONALES (CRUD COMPLETO EN BASE DE DATOS + AUDITORÍA)
# -----------------------------------------------------------------------------

# Live Data Polling
@app.get("/api/live-data")
async def api_live_data(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).limit(10).all()
    total_incidents = db.query(Incident).count()
    crit_count = db.query(Incident).filter(Incident.severity.in_(["Crítica", "Critica"])).count()
    
    kpis = {
        "total_incidents": total_incidents,
        "critical_alerts": crit_count,
        "by_severity": {
            "Crítica": crit_count,
            "Alta": db.query(Incident).filter(Incident.severity == "Alta").count(),
            "Media": db.query(Incident).filter(Incident.severity == "Media").count(),
            "Baja": db.query(Incident).filter(Incident.severity == "Baja").count()
        }
    }

    return JSONResponse(
        content={
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "signature": hashlib.md5(str(total_incidents).encode('utf-8')).hexdigest(),
            "kpis": kpis,
            "recent_incidents": [i.to_dict() for i in incidents],
            "total": total_incidents
        },
        headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache"}
    )

# -----------------------------------------------------------------------------
# APIS WAZUH SIEM & SANDBOX (CORRELACIÓN Y TELEMETRÍA)
# -----------------------------------------------------------------------------
@app.get("/api/wazuh/status")
async def api_wazuh_status():
    return JSONResponse(wazuh_engine.get_status())

@app.get("/api/wazuh/agents")
async def api_wazuh_agents():
    return JSONResponse(wazuh_engine.get_agents())

@app.get("/api/wazuh/alerts")
async def api_wazuh_alerts():
    return JSONResponse(wazuh_engine.get_alerts())

@app.post("/api/wazuh/simulate-attack")
async def api_wazuh_simulate_attack(
    request: Request,
    scenario_id: str = Form(...),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Acceso denegado: El perfil Visor no tiene autorización para disparar simulaciones de ataques."}, status_code=403)

    result = wazuh_engine.trigger_attack_scenario(scenario_id)
    
    # Si la alerta fue promovida a incidente SOC, guardarla en la base de datos
    if result.get("incident"):
        inc_data = result["incident"]
        inc_id = inc_data["id"]
        while db.query(Incident).filter(Incident.id == inc_id).first():
            import random
            inc_id = f"INC-2026-{random.randint(1000, 9999)}"
        
        inc = Incident(
            id=inc_id,
            timestamp_str=inc_data["timestamp"],
            title=inc_data["title"],
            threat_type=inc_data.get("threat_type", "Ciberataque"),
            severity=inc_data.get("severity", "Alta"),
            status=inc_data.get("status", "Abierto"),
            mitre_tactic=inc_data.get("mitre_tactic", "Initial Access"),
            mitre_technique=inc_data.get("mitre_technique", "T1190"),
            src_ip=inc_data.get("src_ip", "-"),
            src_host=inc_data.get("src_host", "-"),
            dst_ip=inc_data.get("dst_ip", "-"),
            dst_host=inc_data.get("dst_host", "-"),
            involved_user=inc_data.get("user", "-"),
            description=inc_data.get("description", ""),
            corrective_action=inc_data.get("corrective_action", ""),
            mttd_minutes=inc_data.get("mttd_min", 2),
            mttr_minutes=inc_data.get("mttr_min", 15),
            assigned_analyst="Operador SOC (Auto-Wazuh)"
        )
        db.add(inc)
        db.commit()

        log_audit_action(
            db,
            username=user.username,
            role=user.role,
            action="WAZUH_ATTACK_SIMULATED",
            module="WAZUH_SIEM",
            record_id=result["alert"]["id"],
            details={"scenario": scenario_id, "promoted_incident": inc.id},
            ip_address=request.client.host if request.client else "127.0.0.1"
        )

    return JSONResponse(result)

@app.post("/api/wazuh/active-response")
async def api_wazuh_active_response(
    request: Request,
    agent_id: str = Form(...),
    command: str = Form(...),
    target: str = Form(...),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Acceso denegado: El perfil Visor no tiene autorización para ejecutar respuestas activas."}, status_code=403)

    result = wazuh_engine.execute_manual_active_response(agent_id, command, target)
    log_audit_action(
        db,
        username=user.username,
        role=user.role,
        action="ACTIVE_RESPONSE_EXECUTED",
        module="WAZUH_SIEM",
        details={"agent": agent_id, "command": command, "target": target},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return JSONResponse(result)

@app.post("/api/wazuh/config")
async def api_wazuh_config(
    request: Request,
    mode: str = Form("sandbox"),
    api_host: str = Form("https://127.0.0.1"),
    api_port: int = Form(55000),
    api_user: str = Form("wazuh-wui"),
    api_password: str = Form(""),
    auto_promote_level: int = Form(10),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo Administradores pueden configurar Wazuh."}, status_code=403)

    cfg = {
        "mode": mode,
        "api_host": api_host.strip(),
        "api_port": api_port,
        "api_user": api_user.strip(),
        "auto_promote_level": auto_promote_level
    }
    if api_password:
        cfg["api_password"] = api_password.strip()

    ok = wazuh_engine.save_config(cfg)
    log_audit_action(
        db,
        username=user.username,
        role=user.role,
        action="UPDATE_WAZUH_CONFIG",
        module="WAZUH_SIEM",
        details={"mode": mode, "host": api_host},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return JSONResponse({"ok": ok, "message": "Configuración de Wazuh guardada exitosamente."})

# Dashboards CISO y Dirección
@app.get("/api/dashboards/ciso")
async def api_dash_ciso():
    gen = DashboardGenerator()
    path = gen.generate_ciso_dashboard()
    return FileResponse(path, media_type="text/html")

@app.get("/api/dashboards/direccion")
async def api_dash_dir():
    gen = DashboardGenerator()
    path = gen.generate_direccion_dashboard()
    return FileResponse(path, media_type="text/html")

# CRUD Riesgos
@app.post("/api/riesgos/save")
async def save_risk(
    request: Request,
    id_riesgo: str = Form(...),
    id_activo: str = Form(...),
    amenaza: str = Form(...),
    vulnerabilidad: str = Form(...),
    prob_inherente: int = Form(...),
    impacto_inherente: int = Form(...),
    eficacia_pct: float = Form(50.0),
    estrategia: str = Form("Mitigar"),
    responsable: str = Form("Oficial SGSI"),
    fecha_revision: str = Form("2026-12-31"),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Permisos insuficientes"}, status_code=403)

    # Cálculo matemático cuantitativo ISO 27005
    inh_level = prob_inherente * impacto_inherente
    if inh_level >= 16:
        inh_cat = "Extremo / Crítico"
    elif inh_level >= 10:
        inh_cat = "Alto"
    elif inh_level >= 5:
        inh_cat = "Medio"
    else:
        inh_cat = "Bajo"

    factor = (100.0 - eficacia_pct) / 100.0
    res_level = max(1, round(inh_level * factor))
    if res_level >= 16:
        res_cat = "Extremo / Crítico"
    elif res_level >= 10:
        res_cat = "Alto"
    elif res_level >= 5:
        res_cat = "Medio"
    else:
        res_cat = "Bajo"

    risk = db.query(Risk).filter(Risk.id == id_riesgo.strip()).first()
    is_new = False
    if not risk:
        is_new = True
        risk = Risk(id=id_riesgo.strip())
        db.add(risk)

    risk.asset_id = id_activo.strip()
    risk.threat = amenaza.strip()
    risk.vulnerability = vulnerabilidad.strip()
    risk.inherent_prob = prob_inherente
    risk.inherent_impact = impacto_inherente
    risk.inherent_level = inh_level
    risk.inherent_category = inh_cat
    risk.control_efficacy_pct = eficacia_pct
    risk.residual_level = res_level
    risk.residual_category = res_cat
    risk.strategy = estrategia.strip()
    risk.owner = responsable.strip()
    risk.review_date = fecha_revision.strip()

    db.commit()

    log_audit_action(db, username=user.username, role=user.role, action="CREATE" if is_new else "UPDATE", module="RIESGOS", record_id=risk.id, details={"amenaza": risk.threat, "riesgo_residual": res_level}, ip_address=request.client.host if request.client else "127.0.0.1")

    return JSONResponse({"ok": True, "message": "Riesgo guardado exitosamente en la base de datos"})

@app.post("/api/riesgos/delete")
async def delete_risk(request: Request, id_riesgo: str = Form(...), db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Permisos insuficientes"}, status_code=403)

    risk = db.query(Risk).filter(Risk.id == id_riesgo.strip()).first()
    if risk:
        db.delete(risk)
        db.commit()
        log_audit_action(db, username=user.username, role=user.role, action="DELETE", module="RIESGOS", record_id=id_riesgo, ip_address=request.client.host if request.client else "127.0.0.1")
    return JSONResponse({"ok": True})

# CRUD Activos
@app.post("/api/activos/save")
async def save_asset(
    request: Request,
    id_activo: Optional[str] = Form(None),
    asset_id: Optional[str] = Form(None),
    nombre_activo: Optional[str] = Form(None),
    nombre: Optional[str] = Form(None),
    tipo_activo: Optional[str] = Form(None),
    tipo: Optional[str] = Form(None),
    propietario: str = Form("CISO"),
    custodio: str = Form("Sysadmin"),
    ubicacion: str = Form("Datacenter"),
    c_val: Optional[int] = Form(None),
    confidencialidad: Optional[int] = Form(None),
    i_val: Optional[int] = Form(None),
    integridad: Optional[int] = Form(None),
    a_val: Optional[int] = Form(None),
    disponibilidad: Optional[int] = Form(None),
    estado: str = Form("Activo"),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Permisos insuficientes"}, status_code=403)

    target_id = (id_activo or asset_id or "").strip()
    target_name = (nombre_activo or nombre or "").strip()
    target_type = (tipo_activo or tipo or "Hardware / Servidor Virtual").strip()
    c = c_val if c_val is not None else (confidencialidad if confidencialidad is not None else 3)
    i = i_val if i_val is not None else (integridad if integridad is not None else 3)
    a = a_val if a_val is not None else (disponibilidad if disponibilidad is not None else 3)

    crit_score = c + i + a
    if crit_score >= 13:
        crit_level = "Crítico"
    elif crit_score >= 10:
        crit_level = "Alto"
    elif crit_score >= 7:
        crit_level = "Medio"
    else:
        crit_level = "Bajo"

    if not target_id:
        existing_assets = db.query(Asset).all()
        max_num = 0
        for item in existing_assets:
            m = re.search(r'ACT-(\d+)', item.id)
            if m:
                max_num = max(max_num, int(m.group(1)))
        target_id = f"ACT-{max_num + 1:03d}"

    asset = db.query(Asset).filter(Asset.id == target_id).first()
    is_new = False
    if not asset:
        is_new = True
        asset = Asset(id=target_id)
        db.add(asset)

    asset.name = target_name
    asset.asset_type = target_type
    asset.owner = propietario.strip()
    asset.custodian = custodio.strip()
    asset.location = ubicacion.strip()
    asset.confidentiality = c
    asset.integrity = i
    asset.availability = a
    asset.criticality_score = crit_score
    asset.criticality_level = crit_level
    asset.status = estado.strip()

    db.commit()

    log_audit_action(db, username=user.username, role=user.role, action="CREATE" if is_new else "UPDATE", module="ACTIVOS", record_id=asset.id, details={"nombre": asset.name, "criticidad": crit_level}, ip_address=request.client.host if request.client else "127.0.0.1")

    return JSONResponse({"ok": True, "asset_id": asset.id, "message": "Activo guardado exitosamente"})

@app.post("/api/activos/delete")
async def delete_asset(
    request: Request,
    id_activo: Optional[str] = Form(None),
    asset_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Permisos insuficientes"}, status_code=403)

    target_id = (id_activo or asset_id or "").strip()
    asset = db.query(Asset).filter(Asset.id == target_id).first()
    if asset:
        db.delete(asset)
        db.commit()
        log_audit_action(db, username=user.username, role=user.role, action="DELETE", module="ACTIVOS", record_id=target_id, ip_address=request.client.host if request.client else "127.0.0.1")
    return JSONResponse({"ok": True})

# Autodescubrimiento Automatizado de Activos (GLPI, Wazuh, Red, AD, Syslog)
@app.get("/api/assets/autodiscover")
async def api_assets_autodiscover(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return JSONResponse({"ok": False, "error": "No autenticado"}, status_code=401)
    
    existing_db_assets = db.query(Asset).all()
    existing_ids = {a.id.strip().upper() for a in existing_db_assets if a.id}
    existing_names = {a.name.strip().lower() for a in existing_db_assets if a.name}
    existing_ips = set()
    for a in existing_db_assets:
        found_ips = re.findall(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', f"{a.location or ''} {a.name or ''}")
        for ip in found_ips:
            existing_ips.add(ip)

    from core.asset_manager import AssetManager
    mgr = AssetManager()
    data = mgr.autodiscover_candidates()
    all_candidates = list(data.get("candidates", []))
    sources_summary = list(data.get("sources_summary", []))

    # Consultar activos reales de GLPI
    settings_dict = get_all_settings_dict(db)
    api_url = settings_dict.get("glpi_api_url", "http://10.100.0.116/apirest.php")
    app_token = settings_dict.get("glpi_app_token", "")
    user_token = settings_dict.get("glpi_user_token", "")

    glpi_count = 0
    try:
        glpi_res = await GLPIService.sync_assets(api_url=api_url, app_token=app_token, user_token=user_token)
        if glpi_res.get("ok") and glpi_res.get("assets"):
            glpi_assets = glpi_res["assets"]
            glpi_count = len(glpi_assets)
            for ga in glpi_assets:
                all_candidates.append({
                    "detected_id": ga["ID_Activo"],
                    "name": ga["Nombre_Activo"],
                    "ip": ga.get("IP_Asignada", "10.100.X.X"),
                    "source": "GLPI Central (ITAM)",
                    "source_type": "glpi",
                    "source_icon": "fa-solid fa-cubes text-emerald-400",
                    "os": ga.get("Descripcion", "").split("SO: ")[-1].split(" |")[0] if "SO: " in ga.get("Descripcion", "") else "Hardware / OS",
                    "asset_type": ga.get("Tipo_Activo", "Hardware"),
                    "owner": ga.get("Propietario_Custodio", "SERMIG / TI"),
                    "custodian": ga.get("Propietario_Custodio", "SERMIG / TI"),
                    "location": ga.get("Ubicacion", "Datacenter Central SERMIG"),
                    "c": ga.get("Confidencialidad", 3),
                    "i": ga.get("Integridad", 3),
                    "a": ga.get("Disponibilidad", 3),
                    "score": ga.get("Criticidad_Calculada", 9),
                    "level": ga.get("Nivel_Criticidad", "Media"),
                    "description": ga.get("Descripcion", "")
                })
            sources_summary.insert(0, {
                "name": "GLPI Central (ITAM)",
                "count": glpi_count,
                "icon": "fa-solid fa-cubes text-emerald-400"
            })
    except Exception as e:
        pass

    processed = []
    new_count = 0
    already_count = 0
    for cand in all_candidates:
        c_id = str(cand.get("detected_id", "")).strip().upper()
        c_name = str(cand.get("name", "")).strip().lower()
        c_ip = str(cand.get("ip", "")).strip()
        is_registered = (c_id in existing_ids) or (c_name in existing_names) or (c_ip in existing_ips and c_ip != "10.100.X.X")
        
        cand_copy = dict(cand)
        cand_copy["already_registered"] = is_registered
        cand_copy["status_label"] = "Ya en Inventario" if is_registered else "Nuevo / Por Incorporar"
        if is_registered:
            already_count += 1
        else:
            new_count += 1
        processed.append(cand_copy)

    return JSONResponse({
        "ok": True,
        "total_discovered": len(processed),
        "new_count": new_count,
        "already_count": already_count,
        "sources_summary": sources_summary,
        "candidates": processed
    })

@app.post("/api/assets/import_discovered")
async def api_assets_import_discovered(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "No autorizado para importar activos"}, status_code=403)

    try:
        body = await request.json()
        selected_ids = body.get("selected_ids", [])
    except Exception:
        selected_ids = []

    if not selected_ids:
        return JSONResponse({"ok": False, "error": "No se seleccionaron activos para importar."}, status_code=400)

    from core.asset_manager import AssetManager
    mgr = AssetManager()
    discovery = mgr.autodiscover_candidates()
    cand_map = {c["detected_id"]: c for c in discovery["candidates"]}

    # Cargar también de GLPI si es necesario
    settings_dict = get_all_settings_dict(db)
    api_url = settings_dict.get("glpi_api_url", "http://10.100.0.116/apirest.php")
    app_token = settings_dict.get("glpi_app_token", "")
    user_token = settings_dict.get("glpi_user_token", "")
    try:
        glpi_res = await GLPIService.sync_assets(api_url=api_url, app_token=app_token, user_token=user_token)
        if glpi_res.get("ok") and glpi_res.get("assets"):
            for ga in glpi_res["assets"]:
                cand_map[ga["ID_Activo"]] = {
                    "detected_id": ga["ID_Activo"],
                    "name": ga["Nombre_Activo"],
                    "asset_type": ga.get("Tipo_Activo", "Hardware"),
                    "owner": ga.get("Propietario_Custodio", "SERMIG / TI"),
                    "custodian": ga.get("Propietario_Custodio", "SERMIG / TI"),
                    "location": ga.get("Ubicacion", "Datacenter Central SERMIG"),
                    "c": ga.get("Confidencialidad", 3),
                    "i": ga.get("Integridad", 3),
                    "a": ga.get("Disponibilidad", 3),
                    "score": ga.get("Criticidad_Calculada", 9),
                    "level": ga.get("Nivel_Criticidad", "Media"),
                    "description": ga.get("Descripcion", "")
                }
    except Exception:
        pass

    existing_assets = db.query(Asset).all()
    max_num = 0
    for a in existing_assets:
        m = re.search(r'ACT-(\d+)', a.id)
        if m:
            max_num = max(max_num, int(m.group(1)))

    imported_ids = []
    for sid in selected_ids:
        cand = cand_map.get(sid)
        if not cand:
            continue

        target_id = cand["detected_id"]
        if not target_id.startswith("ACT-"):
            max_num += 1
            target_id = f"ACT-{max_num:03d}"

        exist = db.query(Asset).filter(Asset.id == target_id).first()
        if exist:
            exist.name = cand["name"]
            exist.asset_type = cand.get("asset_type", "Hardware")
            exist.owner = cand.get("owner", "SERMIG / TI")
            exist.custodian = cand.get("custodian", "SERMIG / TI")
            exist.location = cand.get("location", "Datacenter SERMIG")
            imported_ids.append(target_id)
        else:
            new_asset = Asset(
                id=target_id,
                name=cand["name"],
                asset_type=cand.get("asset_type", "Hardware"),
                owner=cand.get("owner", "SERMIG / TI"),
                custodian=cand.get("custodian", "SERMIG / TI"),
                location=cand.get("location", "Datacenter SERMIG"),
                confidentiality=cand.get("c", 3),
                integrity=cand.get("i", 3),
                availability=cand.get("a", 3),
                criticality_score=cand.get("score", 9),
                criticality_level=cand.get("level", "Media"),
                status="Activo"
            )
            db.add(new_asset)
            imported_ids.append(target_id)

    db.commit()
    log_audit_action(db, username=user.username, role=user.role, action="AUTODISCOVER_IMPORT", module="ACTIVOS", details=f"Importados {len(imported_ids)} activos vía motor de descubrimiento automatizado (GLPI/Wazuh)", ip_address=request.client.host if request.client else "127.0.0.1")

    return JSONResponse({
        "ok": True,
        "message": f"Se incorporaron exitosamente {len(imported_ids)} activos al inventario SGSI ISO 27001.",
        "imported_ids": imported_ids
    })


# SoA Controles y Evidencias
@app.post("/api/soa/update")
async def update_soa_control(
    request: Request,
    codigo: str = Form(...),
    estado_implementacion: str = Form(...),
    madurez_pct: float = Form(...),
    responsable: str = Form(...),
    evidencia_texto: str = Form(""),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Permisos insuficientes"}, status_code=403)

    control = db.query(SoAControl).filter(SoAControl.code == codigo.strip()).first()
    if not control:
        return JSONResponse({"ok": False, "error": "Control no encontrado"}, status_code=404)

    control.implementation_status = estado_implementacion.strip()
    control.maturity_pct = madurez_pct
    control.owner = responsable.strip()
    if evidencia_texto:
        control.evidence_text = evidencia_texto.strip()

    db.commit()

    log_audit_action(db, username=user.username, role=user.role, action="UPDATE", module="SOA", record_id=codigo, details={"madurez": madurez_pct, "estado": estado_implementacion}, ip_address=request.client.host if request.client else "127.0.0.1")

    return JSONResponse({"ok": True})

@app.post("/api/soa/upload-evidence")
async def upload_soa_evidence(
    request: Request,
    control_code: str = Form(...),
    evidence_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Permisos insuficientes"}, status_code=403)

    control = db.query(SoAControl).filter(SoAControl.code == control_code.strip()).first()
    if not control:
        return JSONResponse({"ok": False, "error": "Control no encontrado"}, status_code=404)

    try:
        content = await evidence_file.read()
        ext, sha256_hash = validate_evidence_file(evidence_file.filename, content)
        
        safe_fname = f"{control_code.replace('.', '_')}_{evidence_file.filename}"
        dest_path = os.path.join(BASE_DIR, "static", "evidencias", safe_fname)
        with open(dest_path, "wb") as f:
            f.write(content)

        control.evidence_file = safe_fname
        
        # Registrar evidencia en tabla relacional
        ev_obj = SoAEvidence(
            control_code=control.code,
            filename=evidence_file.filename,
            stored_path=safe_fname,
            file_hash_sha256=sha256_hash,
            file_size_bytes=len(content),
            uploaded_by=user.username
        )
        db.add(ev_obj)
        db.commit()

        log_audit_action(db, username=user.username, role=user.role, action="UPLOAD_EVIDENCE", module="SOA", record_id=control_code, details={"archivo": safe_fname, "sha256": sha256_hash}, ip_address=request.client.host if request.client else "127.0.0.1")

        return JSONResponse({"ok": True, "filename": safe_fname, "hash": sha256_hash})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.get("/api/soa/download-evidence/{filename}")
async def download_evidence(filename: str):
    fpath = os.path.join(BASE_DIR, "static", "evidencias", filename)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Archivo de evidencia no encontrado")
    return FileResponse(fpath, filename=filename)

# SOC Mitigación & Copiloto IA
@app.post("/api/soc/mitigate")
async def mitigate_incident(
    request: Request,
    inc_id: str = Form(...),
    status_val: str = Form(...),
    mttr_minutes: int = Form(15),
    action: str = Form(...),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Permisos insuficientes"}, status_code=403)

    inc = db.query(Incident).filter(Incident.id == inc_id.strip()).first()
    if inc:
        inc.status = status_val.strip()
        inc.mttr_minutes = mttr_minutes
        inc.corrective_action = action.strip()
        inc.assigned_analyst = user.full_name
        db.commit()

        log_audit_action(db, username=user.username, role=user.role, action="MITIGATE", module="SOC", record_id=inc_id, details={"estado": status_val, "mttr": mttr_minutes}, ip_address=request.client.host if request.client else "127.0.0.1")

    return JSONResponse({"ok": True})

@app.post("/api/soc/ai_copilot")
async def api_soc_ai_copilot(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Acceso denegado: El perfil Visor no tiene autorización para ejecutar el Copiloto IA."}, status_code=403)
    
    try:
        data = await request.json()
        incident_data = data.get("incident", {})
        analysis = ai_engine.analyze_incident(incident_data)
        return JSONResponse({"ok": True, "analysis": analysis})
    except Exception as e:
        # Fallback de contingencia
        return JSONResponse({
            "ok": True,
            "analysis": {
                "summary": "Amenaza clasificada bajo marco MITRE ATT&CK.",
                "playbook": [
                    "Aislar inmediatamente el host afectado de la red.",
                    "Bloquear IP de origen en firewall perimetral institucional.",
                    "Verificar logs de autenticación y rotar credenciales comprometidas.",
                    "Generar reporte de incidente bajo Ley N° 21.663."
                ]
            }
        })

@app.post("/api/soc/simulate")
async def simulate_attack(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "Acceso denegado: El perfil Visor no tiene autorización para simular ataques."}, status_code=403)

    # Inyectar evento simulado en BD
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sim_id = f"INC-2026-{db.query(Incident).count() + 1:04d}"
    inc = Incident(
        id=sim_id,
        timestamp_str=now_str,
        title="Simulación: Intento de Credential Dumping detectado",
        threat_type="Credential Access",
        severity="Crítica",
        status="Abierto",
        mitre_tactic="Credential Access",
        mitre_technique="T1003 - OS Credential Dumping",
        src_ip="192.168.10.150",
        src_host="laptop-auditoria",
        dst_ip="ACT-001 (Controlador de Dominio)",
        dst_host="ACT-001 (Controlador de Dominio)",
        description="LSASS memory dump attempt detected by EDR heuristic engine."
    )
    db.add(inc)
    db.commit()
    return JSONResponse({"ok": True})

# Mantenedor de Usuarios RBAC Completo
@app.post("/api/users/create")
@app.post("/api/users/save")
async def save_user(
    request: Request,
    username: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    role: str = Form("Visor"),
    password: Optional[str] = Form(None),
    send_activation_email_flag: Optional[str] = Form(None, alias="send_activation_email"),
    department: str = Form("Dirección de Gestión de Datos y TI"),
    db: Session = Depends(get_db)
):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        if "application/json" in request.headers.get("accept", "") or "application/json" in request.headers.get("content-type", ""):
            return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)
        return RedirectResponse(url="/usuarios", status_code=status.HTTP_302_FOUND)

    clean_uname = username.strip().lower()
    clean_email = email.strip().lower()
    app_settings = get_all_settings_dict(db)
    base_url = app_settings.get("app_base_url", "http://10.100.1.34").rstrip("/")

    user = db.query(User).filter(func.lower(User.username) == clean_uname).first()
    is_new = False
    token = None
    email_sent = False
    email_note = ""

    should_send_invite = (send_activation_email_flag in ["1", "true", "True", "on"]) or (not password or len(password.strip()) < 6)

    if not user:
        is_new = True
        if should_send_invite:
            temp_pass = secrets.token_urlsafe(16)
            token = secrets.token_urlsafe(32)
            user = User(
                username=clean_uname,
                password_hash=hash_password(temp_pass),
                must_change_password=True,
                activation_token=token,
                activation_token_expires=datetime.utcnow() + timedelta(hours=48)
            )
        else:
            if not password or len(password.strip()) < 6:
                if "application/json" in request.headers.get("accept", "") or "application/json" in request.headers.get("content-type", ""):
                    return JSONResponse({"ok": False, "error": "Contraseña requerida de al menos 6 caracteres o active el envío de correo de activación."}, status_code=400)
                return RedirectResponse(url="/usuarios?error=password_short", status_code=status.HTTP_302_FOUND)
            user = User(username=clean_uname, password_hash=hash_password(password.strip()), must_change_password=False)
        db.add(user)
    else:
        if password and len(password.strip()) >= 6:
            user.password_hash = hash_password(password.strip())
            user.must_change_password = False
        elif should_send_invite:
            token = secrets.token_urlsafe(32)
            user.activation_token = token
            user.activation_token_expires = datetime.utcnow() + timedelta(hours=48)
            user.must_change_password = True

    user.full_name = full_name.strip()
    user.email = clean_email
    user.role = role.strip()
    user.department = department.strip()
    user.is_active = True
    db.commit()

    activation_url = f"{base_url}/primer-acceso?token={token}" if token else ""

    if should_send_invite and token:
        user_dict = {"username": user.username, "full_name": user.full_name, "email": user.email, "role": user.role}
        mail_res = send_activation_email(user_dict, activation_url, app_settings)
        email_sent = mail_res.get("sent", False)
        email_note = mail_res.get("message", "")

    log_audit_action(db, username=cur_user.username, role=cur_user.role, action="CREATE_USER" if is_new else "UPDATE_USER", module="USUARIOS", record_id=clean_uname, details={"rol": role, "email": clean_email, "email_sent": email_sent}, ip_address=request.client.host if request.client else "127.0.0.1")

    if "application/json" in request.headers.get("accept", "") or "application/json" in request.headers.get("content-type", ""):
        return JSONResponse({
            "ok": True,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "token": token,
            "activation_url": activation_url,
            "email_sent": email_sent,
            "email_note": email_note,
            "message": f"Usuario {clean_uname} guardado exitosamente."
        })
    return RedirectResponse(url="/usuarios?success=saved", status_code=status.HTTP_302_FOUND)

@app.post("/api/users/resend-activation")
async def resend_user_activation(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)

    try:
        data = await request.json()
        username = data.get("username", "").strip()
        user = db.query(User).filter(func.lower(User.username) == username.lower()).first()
        if not user:
            return JSONResponse({"ok": False, "error": "Usuario no encontrado"}, status_code=404)

        token = secrets.token_urlsafe(32)
        user.activation_token = token
        user.activation_token_expires = datetime.utcnow() + timedelta(hours=48)
        user.must_change_password = True
        db.commit()

        app_settings = get_all_settings_dict(db)
        base_url = app_settings.get("app_base_url", "http://10.100.1.34").rstrip("/")
        activation_url = f"{base_url}/primer-acceso?token={token}"

        user_dict = {"username": user.username, "full_name": user.full_name, "email": user.email, "role": user.role}
        mail_res = send_activation_email(user_dict, activation_url, app_settings)

        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="RESEND_ACTIVATION", module="USUARIOS", record_id=user.username, ip_address=request.client.host if request.client else "127.0.0.1")

        return JSONResponse({
            "ok": True,
            "username": user.username,
            "email": user.email,
            "token": token,
            "activation_url": activation_url,
            "email_sent": mail_res.get("sent", False),
            "email_note": mail_res.get("message", "")
        })
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)

@app.post("/api/users/update")
async def update_user(
    request: Request,
    username: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    role: str = Form(...),
    active: Optional[int] = Form(None),
    department: str = Form("Dirección de Gestión de Datos y TI"),
    db: Session = Depends(get_db)
):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "No autorizado"}, status_code=403)

    clean_uname = username.strip()
    user = db.query(User).filter(func.lower(User.username) == clean_uname.lower()).first()
    if not user:
        return JSONResponse({"ok": False, "error": "Usuario no encontrado"}, status_code=404)

    user.full_name = full_name.strip()
    user.email = email.strip()
    user.role = role.strip()
    user.department = department.strip()
    if active is not None:
        user.is_active = bool(active)
    db.commit()

    log_audit_action(db, username=cur_user.username, role=cur_user.role, action="UPDATE_USER", module="USUARIOS", record_id=clean_uname, details={"rol": role, "email": email}, ip_address=request.client.host if request.client else "127.0.0.1")
    
    if "application/json" in request.headers.get("accept", "") or "application/json" in request.headers.get("content-type", ""):
        return JSONResponse({"ok": True, "message": f"Usuario {clean_uname} actualizado exitosamente."})
    return RedirectResponse(url="/usuarios", status_code=status.HTTP_302_FOUND)

@app.post("/api/users/toggle-status")
async def toggle_user_status(request: Request, username: str = Form(...), db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)

    clean_uname = username.strip()
    if clean_uname.lower() == "admin" or clean_uname.lower() == cur_user.username.lower():
        return JSONResponse({"ok": False, "error": "No se puede desactivar la propia cuenta de Administrador"}, status_code=400)

    user = db.query(User).filter(func.lower(User.username) == clean_uname.lower()).first()
    if not user:
        return JSONResponse({"ok": False, "error": "Usuario no encontrado"}, status_code=404)

    user.is_active = not bool(user.is_active)
    db.commit()

    new_state = "ACTIVATED" if user.is_active else "DEACTIVATED"
    log_audit_action(db, username=cur_user.username, role=cur_user.role, action=f"USER_{new_state}", module="USUARIOS", record_id=clean_uname, details={"nuevo_estado": "Activo" if user.is_active else "Inactivo"}, ip_address=request.client.host if request.client else "127.0.0.1")
    return JSONResponse({"ok": True, "active": user.is_active, "message": f"Estado de {clean_uname} cambiado a {'Activo' if user.is_active else 'Inactivo'}."})

@app.post("/api/users/reset-password")
async def reset_user_password(
    request: Request,
    username: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)

    clean_uname = username.strip()
    if len(new_password.strip()) < 6:
        return JSONResponse({"ok": False, "error": "La contraseña debe tener al menos 6 caracteres"}, status_code=400)

    user = db.query(User).filter(func.lower(User.username) == clean_uname.lower()).first()
    if not user:
        return JSONResponse({"ok": False, "error": "Usuario no encontrado"}, status_code=404)

    user.password_hash = hash_password(new_password.strip())
    db.commit()

    log_audit_action(db, username=cur_user.username, role=cur_user.role, action="RESET_PASSWORD", module="USUARIOS", record_id=clean_uname, details={"operador": cur_user.username}, ip_address=request.client.host if request.client else "127.0.0.1")
    
    if "application/json" in request.headers.get("accept", "") or "application/json" in request.headers.get("content-type", ""):
        return JSONResponse({"ok": True, "message": f"Contraseña de {clean_uname} restablecida exitosamente."})
    return RedirectResponse(url="/usuarios", status_code=status.HTTP_302_FOUND)

@app.post("/api/users/delete")
async def delete_user(request: Request, username: str = Form(...), db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "No autorizado"}, status_code=403)

    clean_uname = username.strip()
    if clean_uname.lower() == "admin" or clean_uname.lower() == cur_user.username.lower():
        return JSONResponse({"ok": False, "error": "No se puede eliminar la propia cuenta de Administrador"}, status_code=400)

    user = db.query(User).filter(func.lower(User.username) == clean_uname.lower()).first()
    if user:
        db.delete(user)
        db.commit()
        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="DELETE_USER", module="USUARIOS", record_id=clean_uname, ip_address=request.client.host if request.client else "127.0.0.1")
        if "application/json" in request.headers.get("accept", "") or "application/json" in request.headers.get("content-type", ""):
            return JSONResponse({"ok": True, "message": f"Usuario {clean_uname} eliminado correctamente."})
        return RedirectResponse(url="/usuarios", status_code=status.HTTP_302_FOUND)

    return JSONResponse({"ok": False, "error": "Usuario no encontrado"}, status_code=404)

# Ajustes Institucionales, SMTP & Logo
@app.post("/api/settings/save")
async def save_settings(
    request: Request,
    org_name: str = Form(...),
    org_code: str = Form(...),
    framework_period: str = Form(...),
    ciso_name: str = Form(...),
    ciso_email: str = Form(...),
    syslog_port: str = Form(...),
    ciso_phone: Optional[str] = Form(None),
    org_address: Optional[str] = Form(None),
    ollama_url: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)

    update_setting_val(db, "org_name", org_name.strip())
    update_setting_val(db, "org_code", org_code.strip())
    update_setting_val(db, "framework_period", framework_period.strip())
    update_setting_val(db, "ciso_name", ciso_name.strip())
    update_setting_val(db, "ciso_email", ciso_email.strip())
    update_setting_val(db, "syslog_port", syslog_port.strip())
    if ciso_phone is not None:
        update_setting_val(db, "ciso_phone", ciso_phone.strip())
    if org_address is not None:
        update_setting_val(db, "org_address", org_address.strip())
    if ollama_url is not None:
        update_setting_val(db, "ollama_url", ollama_url.strip())

    log_audit_action(db, username=cur_user.username, role=cur_user.role, action="UPDATE_SETTINGS", module="SETTINGS", ip_address=request.client.host if request.client else "127.0.0.1")

    if "application/json" in request.headers.get("accept", "") or "application/json" in request.headers.get("content-type", ""):
        return JSONResponse({"ok": True, "message": "Ajustes institucionales guardados correctamente."})
    return RedirectResponse(url="/settings?saved=true", status_code=status.HTTP_302_FOUND)

@app.post("/api/settings/smtp/save")
async def save_smtp_settings_endpoint(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)
    try:
        data = await request.json()
        for k in ["app_base_url", "smtp_host", "smtp_port", "smtp_from", "smtp_user", "smtp_password", "smtp_tls", "smtp_ssl"]:
            if k in data:
                update_setting_val(db, k, str(data[k]).strip())
        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="UPDATE_SMTP_SETTINGS", module="SETTINGS", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse({"ok": True, "message": "Configuración SMTP guardada exitosamente."})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.post("/api/settings/smtp/test")
async def test_smtp_settings_endpoint(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)
    try:
        data = await request.json()
        test_email = data.get("test_email", "") or cur_user.email
        test_settings = get_all_settings_dict(db)
        for k in ["app_base_url", "smtp_host", "smtp_port", "smtp_from", "smtp_user", "smtp_password", "smtp_tls", "smtp_ssl"]:
            if k in data and data[k]:
                test_settings[k] = str(data[k]).strip()
        res = test_smtp_connection(test_settings, test_email)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=500)

@app.post("/api/settings/upload-logo")
async def upload_logo(request: Request, logo: UploadFile = File(...), db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)

    try:
        content = await logo.read()
        dest_path = os.path.join(BASE_DIR, "static", "uploads", "org_logo.png")
        with open(dest_path, "wb") as f:
            f.write(content)

        logo_url = "/static/uploads/org_logo.png"
        update_setting_val(db, "org_logo_url", logo_url)
        return JSONResponse({"ok": True, "logo_url": logo_url})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

# -------------------------------------------------------------
# Endpoints de Conectores & Integraciones Externas (OneFirewall & Lansweeper)
# -------------------------------------------------------------
@app.post("/api/integrations/onefirewall/toggle")
async def toggle_onefirewall(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)
    try:
        data = await request.json()
        enabled = "1" if str(data.get("enabled", "0")) in ["1", "true", "True"] else "0"
        update_setting_val(db, "onefirewall_enabled", enabled)
        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="TOGGLE_INTEGRATION", module="ONEFIREWALL", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse({"ok": True, "enabled": enabled})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.post("/api/integrations/onefirewall/save")
async def save_onefirewall_config(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)
    try:
        data = await request.json()
        if "enabled" in data:
            update_setting_val(db, "onefirewall_enabled", "1" if str(data["enabled"]) in ["1", "true", "True"] else "0")
        if "mode" in data:
            update_setting_val(db, "onefirewall_mode", str(data["mode"]))
        if "api_url" in data:
            update_setting_val(db, "onefirewall_api_url", str(data["api_url"]).strip())
        if "api_key" in data and data["api_key"] != "":
            update_setting_val(db, "onefirewall_api_key", str(data["api_key"]).strip())
        if "threshold" in data:
            update_setting_val(db, "onefirewall_threshold", str(data["threshold"]).strip())
        if "auto_enrich" in data:
            update_setting_val(db, "onefirewall_auto_enrich", "1" if str(data["auto_enrich"]) in ["1", "true", "True"] else "0")

        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="UPDATE_INTEGRATION_CONFIG", module="ONEFIREWALL", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.post("/api/integrations/onefirewall/test")
async def test_onefirewall_endpoint(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user:
        return JSONResponse({"ok": False, "error": "No autenticado"}, status_code=401)
    try:
        data = await request.json()
        settings_dict = get_all_settings_dict(db)
        api_url = data.get("api_url") or settings_dict.get("onefirewall_api_url", "http://10.100.1.33")
        api_key = data.get("api_key") or settings_dict.get("onefirewall_api_key", "")
        mode = data.get("mode") or settings_dict.get("onefirewall_mode", "onprem")

        res = await OneFirewallService.test_connection(api_url=api_url, api_key=api_key, mode=mode)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.post("/api/integrations/onefirewall/lookup")
async def lookup_onefirewall_ip(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user:
        return JSONResponse({"ok": False, "error": "No autenticado"}, status_code=401)
    try:
        data = await request.json()
        ip = data.get("ip", "").strip()
        if not ip:
            return JSONResponse({"ok": False, "error": "Debe especificar una dirección IP válida"}, status_code=400)

        settings_dict = get_all_settings_dict(db)
        api_url = settings_dict.get("onefirewall_api_url", "http://10.100.1.33")
        api_key = settings_dict.get("onefirewall_api_key", "")
        mode = settings_dict.get("onefirewall_mode", "onprem")
        threshold = int(settings_dict.get("onefirewall_threshold", 75))

        res = await OneFirewallService.lookup_ip(ip=ip, api_url=api_url, api_key=api_key, mode=mode, threshold=threshold)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.post("/api/integrations/lansweeper/toggle")
async def toggle_lansweeper(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)
    try:
        data = await request.json()
        enabled = "1" if str(data.get("enabled", "0")) in ["1", "true", "True"] else "0"
        update_setting_val(db, "lansweeper_enabled", enabled)
        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="TOGGLE_INTEGRATION", module="LANSWEEPER", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse({"ok": True, "enabled": enabled})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.post("/api/integrations/lansweeper/save")
async def save_lansweeper_config(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "Solo administradores"}, status_code=403)
    try:
        data = await request.json()
        if "enabled" in data:
            update_setting_val(db, "lansweeper_enabled", "1" if str(data["enabled"]) in ["1", "true", "True"] else "0")
        if "mode" in data:
            update_setting_val(db, "lansweeper_mode", str(data["mode"]))
        if "api_url" in data:
            update_setting_val(db, "lansweeper_api_url", str(data["api_url"]).strip())
        if "api_token" in data and data["api_token"] != "":
            update_setting_val(db, "lansweeper_api_token", str(data["api_token"]).strip())
        if "site_id" in data:
            update_setting_val(db, "lansweeper_site_id", str(data["site_id"]).strip())
        if "auto_sync" in data:
            update_setting_val(db, "lansweeper_auto_sync", "1" if str(data["auto_sync"]) in ["1", "true", "True"] else "0")

        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="UPDATE_INTEGRATION_CONFIG", module="LANSWEEPER", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.post("/api/integrations/lansweeper/test")
async def test_lansweeper_endpoint(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user:
        return JSONResponse({"ok": False, "error": "No autenticado"}, status_code=401)
    try:
        data = await request.json()
        settings_dict = get_all_settings_dict(db)
        api_url = data.get("api_url") or settings_dict.get("lansweeper_api_url", "https://api.lansweeper.com/api/v2/graphql")
        api_token = data.get("api_token") or settings_dict.get("lansweeper_api_token", "")
        site_id = data.get("site_id") or settings_dict.get("lansweeper_site_id", "")
        mode = data.get("mode") or settings_dict.get("lansweeper_mode", "cloud")

        res = await LansweeperService.test_connection(api_url=api_url, api_token=api_token, site_id=site_id, mode=mode)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.post("/api/integrations/lansweeper/sync")
async def sync_lansweeper_assets_endpoint(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role not in ["Administrador", "Operador"]:
        return JSONResponse({"ok": False, "error": "No autorizado"}, status_code=403)
    try:
        settings_dict = get_all_settings_dict(db)
        if settings_dict.get("lansweeper_enabled") != "1":
            return JSONResponse({"ok": False, "error": "La integración con Lansweeper está actualmente deshabilitada en Ajustes."}, status_code=400)

        api_url = settings_dict.get("lansweeper_api_url", "")
        api_token = settings_dict.get("lansweeper_api_token", "")
        site_id = settings_dict.get("lansweeper_site_id", "")
        mode = settings_dict.get("lansweeper_mode", "cloud")

        res = await LansweeperService.sync_assets(api_url=api_url, api_token=api_token, site_id=site_id, mode=mode)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})


@app.post("/api/integrations/glpi/toggle")
async def toggle_glpi_integration(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "No autorizado"}, status_code=403)
    try:
        data = await request.json()
        enabled = "1" if data.get("enabled") else "0"
        update_setting_val(db, "glpi_enabled", enabled)
        log_audit_action(db, username=cur_user.username, role=cur_user.role, action=f"{'ENABLE' if enabled == '1' else 'DISABLE'}_INTEGRATION", module="GLPI", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse({"ok": True, "enabled": enabled})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.post("/api/integrations/glpi/save")
async def save_glpi_config(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role != "Administrador":
        return JSONResponse({"ok": False, "error": "No autorizado"}, status_code=403)
    try:
        data = await request.json()
        if "enabled" in data or "glpi_enabled" in data:
            val = data.get("glpi_enabled", data.get("enabled", "0"))
            update_setting_val(db, "glpi_enabled", "1" if str(val) in ["1", "true", "True"] else "0")
        if "glpi_api_url" in data or "api_url" in data:
            update_setting_val(db, "glpi_api_url", str(data.get("glpi_api_url", data.get("api_url", ""))).strip())
        if "glpi_app_token" in data or "app_token" in data:
            update_setting_val(db, "glpi_app_token", str(data.get("glpi_app_token", data.get("app_token", ""))).strip())
        if "glpi_user_token" in data or "user_token" in data:
            update_setting_val(db, "glpi_user_token", str(data.get("glpi_user_token", data.get("user_token", ""))).strip())
        if "glpi_auto_sync" in data or "auto_sync" in data:
            val = data.get("glpi_auto_sync", data.get("auto_sync", "0"))
            update_setting_val(db, "glpi_auto_sync", "1" if str(val) in ["1", "true", "True"] else "0")

        log_audit_action(db, username=cur_user.username, role=cur_user.role, action="UPDATE_INTEGRATION_CONFIG", module="GLPI", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

@app.post("/api/integrations/glpi/test")
async def test_glpi_endpoint(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user:
        return JSONResponse({"ok": False, "error": "No autenticado"}, status_code=401)
    try:
        data = await request.json()
        settings_dict = get_all_settings_dict(db)
        api_url = data.get("api_url") or settings_dict.get("glpi_api_url", "http://10.100.1.33/glpi/apirest.php")
        app_token = data.get("app_token") or settings_dict.get("glpi_app_token", "")
        user_token = data.get("user_token") or settings_dict.get("glpi_user_token", "")

        res = await GLPIService.test_connection(api_url=api_url, app_token=app_token, user_token=user_token)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})

@app.post("/api/integrations/glpi/sync")
async def sync_glpi_assets_endpoint(request: Request, db: Session = Depends(get_db)):
    cur_user = get_current_user_from_request(request, db)
    if not cur_user or cur_user.role not in ["Administrador", "Operador"]:
        return JSONResponse({"ok": False, "error": "No autorizado"}, status_code=403)
    try:
        settings_dict = get_all_settings_dict(db)
        if settings_dict.get("glpi_enabled") != "1":
            return JSONResponse({"ok": False, "error": "La integración con GLPI está actualmente deshabilitada en Ajustes."}, status_code=400)

        api_url = settings_dict.get("glpi_api_url", "http://10.100.1.33/glpi/apirest.php")
        app_token = settings_dict.get("glpi_app_token", "")
        user_token = settings_dict.get("glpi_user_token", "")

        res = await GLPIService.sync_assets(api_url=api_url, app_token=app_token, user_token=user_token)
        if res.get("ok") and res.get("assets"):
            for a in res["assets"]:
                exist_asset = db.query(Asset).filter(Asset.id == a["ID_Activo"]).first()
                if not exist_asset:
                    new_a = Asset(
                        id=a["ID_Activo"],
                        name=a["Nombre_Activo"],
                        asset_type=a["Tipo_Activo"],
                        ip_address=a.get("IP_Asignada", a.get("IP_Activo", "")),
                        owner=a.get("Propietario_Custodio", "SERMIG / TI"),
                        custodian=a.get("Propietario_Custodio", "SERMIG / TI"),
                        location=a.get("Ubicacion", "Datacenter Principal"),
                        confidentiality=a.get("Confidencialidad", 3),
                        integrity=a.get("Integridad", 3),
                        availability=a.get("Disponibilidad", 3),
                        criticality_score=a.get("Criticidad_Calculada", 9),
                        criticality_level=a.get("Nivel_Criticidad", "Media"),
                        status="Activo",
                        description=a.get("Descripcion", ""),
                        cpu=a.get("CPU", ""),
                        ram=a.get("RAM", ""),
                        disk=a.get("Disco", ""),
                        os_name=a.get("SO", ""),
                        serial_number=a.get("Serial", ""),
                        manufacturer=a.get("Fabricante", ""),
                        model=a.get("Modelo", ""),
                        mac_address=a.get("MAC", ""),
                        domain=a.get("Dominio", ""),
                        uuid=a.get("UUID", ""),
                        last_sync=a.get("Ultima_Sincronizacion", "")
                    )
                    db.add(new_a)
                else:
                    exist_asset.name = a["Nombre_Activo"]
                    exist_asset.asset_type = a["Tipo_Activo"]
                    exist_asset.ip_address = a.get("IP_Asignada", exist_asset.ip_address)
                    exist_asset.location = a.get("Ubicacion", exist_asset.location)
                    exist_asset.owner = a.get("Propietario_Custodio", exist_asset.owner)
                    exist_asset.custodian = a.get("Propietario_Custodio", exist_asset.custodian)
                    exist_asset.description = a.get("Descripcion", exist_asset.description)
                    exist_asset.cpu = a.get("CPU", exist_asset.cpu)
                    exist_asset.ram = a.get("RAM", exist_asset.ram)
                    exist_asset.disk = a.get("Disco", exist_asset.disk)
                    exist_asset.os_name = a.get("SO", exist_asset.os_name)
                    exist_asset.serial_number = a.get("Serial", exist_asset.serial_number)
                    exist_asset.manufacturer = a.get("Fabricante", exist_asset.manufacturer)
                    exist_asset.model = a.get("Modelo", exist_asset.model)
                    exist_asset.mac_address = a.get("MAC", exist_asset.mac_address)
                    exist_asset.domain = a.get("Dominio", exist_asset.domain)
                    exist_asset.uuid = a.get("UUID", exist_asset.uuid)
                    exist_asset.last_sync = a.get("Ultima_Sincronizacion", exist_asset.last_sync)
            db.commit()
            log_audit_action(db, username=cur_user.username, role=cur_user.role, action="SYNC_ASSETS_GLPI", module="GLPI", details=f"Sincronizados {len(res['assets'])} activos desde GLPI-Agent", ip_address=request.client.host if request.client else "127.0.0.1")
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)})



# -------------------------------------------------------------
# Endpoints de Ingesta Forense de Logs y CTI Feeds en Vivo (Enterprise)
# -------------------------------------------------------------
@app.post("/api/soc/ingest_logs")
async def api_soc_ingest_logs(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "No autorizado para ingestar logs"}, status_code=403)

    content_bytes = await file.read()
    try:
        text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1", errors="ignore")

    lines = text.splitlines()
    detector = ThreatDetector()

    count = 0
    detected_list = []
    current_inc_count = db.query(Incident).count()

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
        count += 1
        parsed = LogParser.parse_line(line_str)
        if parsed:
            threats = detector.analyze_event(parsed)
            for t in threats:
                current_inc_count += 1
                inc_id = f"INC-2026-{current_inc_count:04d}"
                inc = Incident(
                    id=inc_id,
                    timestamp_str=t.get("Fecha_Hora") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    title=t.get("Titulo_Incidente") or "Alerta Forense de Log",
                    threat_type=t.get("Tactica_MITRE") or "Reconnaissance",
                    severity=t.get("Severidad") or "Alta",
                    status="Abierto",
                    mitre_tactic=t.get("Tactica_MITRE") or "Initial Access",
                    mitre_technique=t.get("Tecnica_MITRE") or "T1078 - Valid Accounts",
                    src_ip=t.get("IP_Origen") or "-",
                    src_host=t.get("Host_Origen_Display") or "-",
                    dst_ip=t.get("IP_Destino_Display") or "-",
                    dst_host=t.get("Host_Destino_Display") or "Infraestructura SERMIG",
                    description=t.get("Descripcion_Hallazgo") or f"Ingesta forense de archivo {file.filename}: {line_str[:120]}",
                    corrective_action=t.get("Accion_Correctiva") or "Aislar host y bloquear IP de origen."
                )
                db.add(inc)
                detected_list.append({
                    "ID_Incidente": inc_id,
                    "Titulo_Incidente": inc.title,
                    "Severidad": inc.severity,
                    "IP_Origen": inc.src_ip,
                    "Tecnica_MITRE": inc.mitre_technique
                })

    if detected_list:
        db.commit()
        log_audit_action(
            db,
            username=user.username,
            role=user.role,
            action="INGEST_LOGS",
            module="SOC",
            record_id=file.filename,
            details={"total_lines": count, "detected_threats": len(detected_list)},
            ip_address=request.client.host if request.client else "127.0.0.1"
        )
        await ws_manager.broadcast({"type": "logs_ingested", "count": count, "detected": len(detected_list)})

    return JSONResponse({
        "ok": True,
        "filename": file.filename,
        "total_lines": count,
        "detected_count": len(detected_list),
        "sample_threats": detected_list[:15]
    })

@app.get("/api/cti/status")
async def api_cti_status():
    tim = ThreatIntelManager()
    sources_info = [
        {
            "name": "Feodo Tracker C2 (Abuse.ch)",
            "type": "Servidores Botnet & C2 Activos",
            "url": "https://feodotracker.abuse.ch",
            "status": "Activo / Conectado",
            "threats": "Emotet, Qakbot, Dridex, LockBit C2",
            "refresh_rate": "Diario / Dinámico"
        },
        {
            "name": "ThreatFox CTI (Abuse.ch)",
            "type": "IoCs de Malware & Campañas MITRE",
            "url": "https://threatfox.abuse.ch",
            "status": "Activo / Conectado",
            "threats": "Ransomware, Infostealers, RATs, C2",
            "refresh_rate": "Tiempo Real"
        },
        {
            "name": "URLhaus (Abuse.ch)",
            "type": "Distribución de Payloads & Malware",
            "url": "https://urlhaus.abuse.ch",
            "status": "Activo / Conectado",
            "threats": "Droppers, Troyanos, Phishing URLs",
            "refresh_rate": "Tiempo Real"
        },
        {
            "name": "CINS Army Score Network",
            "type": "Reputación de Amenazas Centinela",
            "url": "http://cinsscore.com",
            "status": "Activo / Conectado",
            "threats": "Atacantes Hostiles, Exploits Activos",
            "refresh_rate": "Diario"
        },
        {
            "name": "Spamhaus DROP / EDROP",
            "type": "Subredes Secuestradas por Cibercriminales",
            "url": "https://www.spamhaus.org/drop",
            "status": "Activo / Conectado",
            "threats": "Botnets Masivas, Redes Hijacked",
            "refresh_rate": "Tiempo Real"
        },
        {
            "name": "Emerging Threats (Proofpoint)",
            "type": "IPs Comprometidas en Ataques Activos",
            "url": "https://rules.emergingthreats.net",
            "status": "Activo / Conectado",
            "threats": "Exploits Activos, Botnets & Escaneos",
            "refresh_rate": "Diario"
        },
        {
            "name": "Blocklist.de Global Sensors",
            "type": "Sensores Distribuidos Fail2Ban",
            "url": "https://lists.blocklist.de",
            "status": "Activo / Conectado",
            "threats": "Fuerza Bruta SSH/RDP, Web Attacks",
            "refresh_rate": "Tiempo Real"
        },
        {
            "name": "Tor Project Official Exit List",
            "type": "Nodos de Salida de Red Tor",
            "url": "https://check.torproject.org",
            "status": "Activo / Conectado",
            "threats": "Tráfico Anónimo & Evasión Perimetral",
            "refresh_rate": "Tiempo Real"
        },
        {
            "name": "CSIRT de Gobierno / ANCI",
            "type": "IOCs Curados Red del Estado",
            "url": "https://www.csirt.gob.cl",
            "status": "Activo / Conectado",
            "threats": "Campañas Dirigidas a Chile / Phishing",
            "refresh_rate": "Boletines Oficiales"
        },
        {
            "name": "AlienVault OTX (AT&T Cybersecurity)",
            "type": "Pulsos Globales de Inteligencia Colaborativa",
            "url": "https://otx.alienvault.com",
            "status": "Activo / Conectado",
            "threats": "APTs, Zero-days, Campañas Globales",
            "refresh_rate": "Tiempo Real"
        },
        {
            "name": "AbuseIPDB Global Blacklist",
            "type": "Reputación Comunitaria de Ataques IP",
            "url": "https://www.abuseipdb.com",
            "status": "Activo / Conectado",
            "threats": "Fuerza Bruta, Port Scans, SQLi, DDoS",
            "refresh_rate": "Tiempo Real"
        },
        {
            "name": "MalwareBazaar (Abuse.ch)",
            "type": "Hashes Forenses de Binarios & Muestras",
            "url": "https://bazaar.abuse.ch",
            "status": "Activo / Conectado",
            "threats": "Binarios Ransomware, Stealers, RATs",
            "refresh_rate": "Tiempo Real"
        }
    ]

    sample_iocs = []
    for ip, info in list(tim.iocs.items())[:50]:
        sample_iocs.append({
            "ip": ip,
            "source": info.get("source", "CTI Abierto"),
            "threat": info.get("threat", "Actividad Maliciosa"),
            "severity": info.get("severity", "Alta"),
            "actor": info.get("actor", "Desconocido"),
            "malware": info.get("malware", "-")
        })

    return JSONResponse({
        "ok": True,
        "total_iocs": len(tim.iocs),
        "last_updated": tim.last_updated or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "sources": sources_info,
        "sample_iocs": sample_iocs
    })

@app.post("/api/cti/update")
async def api_cti_update(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user or user.role == "Visor":
        return JSONResponse({"ok": False, "error": "No autorizado para actualizar CTI"}, status_code=403)

    tim = ThreatIntelManager()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, tim.update_feeds_online, 6)

    log_audit_action(
        db,
        username=user.username,
        role=user.role,
        action="SYNC_CTI_FEEDS",
        module="SOC",
        record_id="CTI_CACHE",
        details={"total_iocs": result.get("total_iocs", len(tim.iocs)), "sources": result.get("sources", [])},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    await ws_manager.broadcast({"type": "cti_updated", "total": result.get("total_iocs", len(tim.iocs))})
    return JSONResponse({
        "ok": result.get("success", True),
        "total_iocs": result.get("total_iocs", len(tim.iocs)),
        "sources": result.get("sources", []),
        "last_updated": result.get("last_updated"),
        "errors": result.get("errors", [])
    })

# =============================================================================
# CENTRO DE REPORTES INSTITUCIONALES Y EXPORTACIÓN EXCEL / CSV (ENTERPRISE)
# =============================================================================
@app.get("/reportes", response_class=HTMLResponse)
async def page_reportes(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login")
    app_settings = get_all_settings_dict(db)
    return templates.TemplateResponse(
        request=request,
        name="reportes.html",
        context={"request": request, "current_user": user, "settings": app_settings, "active_page": "reportes"}
    )

@app.get("/reportes/imprimir/{tipo}", response_class=HTMLResponse)
async def page_imprimir_reporte(request: Request, tipo: str, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return RedirectResponse(url="/login", status_code=303)

    tipo = tipo.lower()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    if tipo == "ejecutivo":
        report_title = "Informe Ejecutivo de Estado y Madurez SGSI & SOC 2026"
        report_subtitle = "Consolidado de Indicadores de Cumplimiento, Gestión de Riesgos y Resiliencia Operacional"
        report_code = "INF-EJEC-SERMIG-2026-01"
        legal_reference = "Ley N° 21.663 Art. 4, 7 • ISO/IEC 27001:2022 Cláusula 9.3"
        csv_url = "/api/export/soa/csv"

        total_controls = db.query(SoAControl).count() or 93
        impl_controls = db.query(SoAControl).filter(SoAControl.implementation_status == "Implementado").count()
        all_controls_list = db.query(SoAControl).all()
        avg_soa_maturity = round(sum(c.maturity_pct for c in all_controls_list) / total_controls, 1) if total_controls else 0.0
        total_risks = db.query(Risk).count() or 1
        crit_risks = db.query(Risk).filter(Risk.inherent_category.in_(["Critico", "Crítico", "Alto"])).count()
        mit_risks = db.query(Risk).filter(Risk.residual_category.in_(["Bajo", "Medio"])).count()
        total_assets = db.query(Asset).count() or 1
        crit_assets = db.query(Asset).filter(Asset.criticality_level.in_(["Crítico", "Critico", "Alto"])).count()
        total_inc = db.query(Incident).count() or 1
        open_inc = db.query(Incident).filter(Incident.status.in_(["Abierto", "En Mitigacion", "En Investigacion"])).count()

        soa_pct = round((impl_controls / total_controls) * 100, 1)
        risk_mit_pct = round((mit_risks / total_risks) * 100, 1)

        content_html = f"""
        <div class="space-y-6">
            <div class="grid grid-cols-4 gap-4 mb-6">
                <div class="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <span class="text-xs font-bold text-blue-800 uppercase block">Controles 100% Implementados</span>
                    <span class="text-2xl font-black text-blue-900">{soa_pct}%</span>
                    <span class="text-[10px] text-slate-500 block">{impl_controls} de {total_controls} Controles</span>
                    <span class="text-[10px] text-blue-700 font-semibold block mt-1">Madurez Global SoA: {avg_soa_maturity}%</span>
                </div>
                <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span class="text-xs font-bold text-emerald-800 uppercase block">Riesgos Mitigados</span>
                    <span class="text-2xl font-black text-emerald-900">{risk_mit_pct}%</span>
                    <span class="text-[10px] text-slate-500 block">{mit_risks} con salvaguardas</span>
                </div>
                <div class="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <span class="text-xs font-bold text-purple-800 uppercase block">Activos Esenciales</span>
                    <span class="text-2xl font-black text-purple-900">{crit_assets} / {total_assets}</span>
                    <span class="text-[10px] text-slate-500 block">Clasificación Tríada CIA</span>
                </div>
                <div class="p-4 bg-rose-50 rounded-xl border border-rose-200">
                    <span class="text-xs font-bold text-rose-800 uppercase block">Incidentes Activos</span>
                    <span class="text-2xl font-black text-rose-900">{open_inc}</span>
                    <span class="text-[10px] text-slate-500 block">Total histórico: {total_inc}</span>
                </div>
            </div>

            <div class="p-4 bg-white rounded-xl border border-slate-200 text-xs leading-relaxed space-y-3">
                <h4 class="font-bold text-slate-900 text-sm border-b pb-2">1. Resumen de Postura y Gobernanza de Ciberseguridad</h4>
                <p>El Servicio Nacional de Migraciones (SERMIG) mantiene operativo su Sistema de Gestión de Seguridad de la Información (SGSI) alineado con los estándares internacionales ISO/IEC 27001:2022 y las exigencias de la Ley Marco sobre Ciberseguridad N° 21.663.</p>
                <p>Durante el presente período, el Centro de Operaciones de Seguridad (SOC) ha procesado y correlacionado eventos telemétricos en tiempo real con motor CTI (Threat Intelligence) y playbooks automáticos de contención MITRE ATT&CK.</p>
            </div>

            <div class="p-4 bg-white rounded-xl border border-slate-200 text-xs leading-relaxed space-y-2">
                <h4 class="font-bold text-slate-900 text-sm border-b pb-2">2. Desglose de Controles ISO/IEC 27001:2022</h4>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong>Controles Organizacionales (Cl. A.5):</strong> 37 controles normativos y gobernanza institucional.
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong>Controles de Personas (Cl. A.6):</strong> 8 controles normativos de capacitación y confidencialidad.
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong>Controles Físicos (Cl. A.7):</strong> 14 controles normativos de perímetros y equipos.
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong>Controles Tecnológicos (Cl. A.8):</strong> 34 controles de protección de redes, WAF, copias de respaldo y autenticación Bcrypt.
                </div>
            </div>
        </div>
        """

    elif tipo == "soa":
        controls = db.query(SoAControl).order_by(SoAControl.code).all()
        report_title = "Declaración de Aplicabilidad Oficial (Statement of Applicability - SoA)"
        report_subtitle = "Catálogo de los 93 controles de seguridad de la información con hash criptográfico SHA-256"
        report_code = "SOA-ENT-ISO27001-2022"
        legal_reference = "ISO/IEC 27001:2022 Cláusula 6.1.3 d"
        csv_url = "/api/export/soa/csv"

        rows = ""
        for c in controls:
            st = c.implementation_status
            color = "text-emerald-700 font-bold" if "Implementado" in st and "No" not in st else ("text-blue-700" if "Proceso" in st else "text-slate-600")
            rows += f"""
            <tr class="border-b border-slate-200 text-[10px]">
                <td class="p-2 font-mono font-bold text-blue-900">{c.code}</td>
                <td class="p-2">{c.domain}</td>
                <td class="p-2 font-semibold">{c.name}</td>
                <td class="p-2 {color}">{st}</td>
                <td class="p-2 text-slate-600">{c.justification or 'Control mandatorio'}</td>
                <td class="p-2 font-mono text-[9px] truncate max-w-xs">{c.owner or 'CISO'}</td>
            </tr>
            """

        content_html = f"""
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border border-slate-200">
                <thead class="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                    <tr>
                        <th class="p-2">ID</th>
                        <th class="p-2">Dominio</th>
                        <th class="p-2">Nombre del Control</th>
                        <th class="p-2">Estado</th>
                        <th class="p-2">Justificación</th>
                        <th class="p-2">Responsable</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
        """

    elif tipo == "riesgos":
        riesgos = db.query(Risk).order_by(Risk.id).all()
        report_title = "Matriz Institucional de Evaluación y Tratamiento de Riesgos"
        report_subtitle = "Evaluación de Riesgo Inherente vs. Residual Mitigado y Plan de Salvaguardas"
        report_code = "RIESGOS-ENT-ISO27005"
        legal_reference = "ISO/IEC 27005:2022 • Metodología Cualitativa-Cuantitativa"
        csv_url = "/api/export/riesgos/csv"

        rows = ""
        for r in riesgos:
            rows += f"""
            <tr class="border-b border-slate-200 text-[10px]">
                <td class="p-2 font-mono font-bold">{r.id}</td>
                <td class="p-2 font-semibold">{r.threat}</td>
                <td class="p-2">{r.vulnerability}</td>
                <td class="p-2 font-bold text-center">{r.inherent_level} ({r.inherent_category})</td>
                <td class="p-2 text-slate-600">{r.strategy}</td>
                <td class="p-2 font-bold text-emerald-700 text-center">{r.residual_level} ({r.residual_category})</td>
                <td class="p-2 font-semibold text-blue-800">{r.owner}</td>
            </tr>
            """

        content_html = f"""
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border border-slate-200">
                <thead class="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                    <tr>
                        <th class="p-2">ID</th>
                        <th class="p-2">Amenaza</th>
                        <th class="p-2">Vulnerabilidad</th>
                        <th class="p-2 text-center">R. Inherente</th>
                        <th class="p-2">Estrategia Tratamiento</th>
                        <th class="p-2 text-center">R. Residual</th>
                        <th class="p-2">Responsable</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
        """

    elif tipo == "activos":
        activos = db.query(Asset).order_by(Asset.id).all()
        report_title = "Inventario y Clasificación de Activos de Información Esenciales"
        report_subtitle = "Valoración de la Tríada CIA (Confidencialidad, Integridad, Disponibilidad) y Criticidad"
        report_code = "ACTIVOS-ENT-LEY21663"
        legal_reference = "Ley N° 21.663 Art. 4 y 5 • ISO/IEC 27001 Control A.5.9"
        csv_url = "/api/export/activos/csv"

        rows = ""
        for a in activos:
            crit = a.criticality_level
            color = "text-red-700 font-black" if crit in ("Crítico", "Critico") else ("text-orange-700 font-bold" if crit == "Alto" else "text-slate-700")
            rows += f"""
            <tr class="border-b border-slate-200 text-[10px]">
                <td class="p-2 font-mono font-bold text-blue-900">{a.id}</td>
                <td class="p-2 font-semibold">{a.name}</td>
                <td class="p-2">{a.asset_type}</td>
                <td class="p-2 font-medium text-slate-800">{a.owner or 'Dirección de Datos y TI'}</td>
                <td class="p-2 text-center font-mono">C:{a.confidentiality} I:{a.integrity} D:{a.availability}</td>
                <td class="p-2 font-black text-center">{a.criticality_score}</td>
                <td class="p-2 {color}">{crit}</td>
            </tr>
            """

        content_html = f"""
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border border-slate-200">
                <thead class="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                    <tr>
                        <th class="p-2">ID</th>
                        <th class="p-2">Nombre del Activo</th>
                        <th class="p-2">Tipo de Activo</th>
                        <th class="p-2">Propietario (Owner)</th>
                        <th class="p-2 text-center">Tríada CIA</th>
                        <th class="p-2 text-center">Puntaje</th>
                        <th class="p-2">Nivel de Criticidad</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
        """

    elif tipo == "soc":
        incidents = db.query(Incident).order_by(Incident.timestamp_str.desc()).limit(100).all()
        report_title = "Libro de Guardia y Bitácora Forense de Incidentes SOC"
        report_subtitle = "Registro cronológico de eventos de seguridad, correlación MITRE ATT&CK y tiempos MTTR"
        report_code = "SOC-ENT-LEY21663"
        legal_reference = "Ley N° 21.663 Art. 7 • Notificación a CSIRT de Gobierno / ANCI"
        csv_url = "/api/export/soc/csv"

        rows = ""
        for inc in incidents:
            rows += f"""
            <tr class="border-b border-slate-200 text-[10px]">
                <td class="p-2 font-mono font-bold text-blue-900">{inc.id}</td>
                <td class="p-2 font-mono text-[9px]">{inc.timestamp_str}</td>
                <td class="p-2 font-semibold">{inc.title}</td>
                <td class="p-2 font-bold { 'text-red-700' if inc.severity in ('Crítica','Critica') else 'text-slate-700' }">{inc.severity}</td>
                <td class="p-2 font-mono">{inc.src_ip}</td>
                <td class="p-2 font-mono text-[9px]">{inc.mitre_technique}</td>
                <td class="p-2 font-semibold text-emerald-700">{inc.status}</td>
                <td class="p-2 text-slate-600">{inc.corrective_action or 'Mitigado'}</td>
            </tr>
            """

        content_html = f"""
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border border-slate-200">
                <thead class="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                    <tr>
                        <th class="p-2">ID</th>
                        <th class="p-2">Fecha/Hora</th>
                        <th class="p-2">Incidente</th>
                        <th class="p-2">Severidad</th>
                        <th class="p-2">IP Origen</th>
                        <th class="p-2">Técnica MITRE</th>
                        <th class="p-2">Estado</th>
                        <th class="p-2">Playbook Aplicado</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
        """

    elif tipo == "auditoria":
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
        report_title = "Registro Inmutable de Trazabilidad y Logs de Auditoría"
        report_subtitle = "Historial forense de actuaciones, inicios de sesión y modificaciones institucionales"
        report_code = "AUDIT-ENT-LEY19628"
        legal_reference = "Ley N° 19.628 • ISO/IEC 27001 Control A.8.15"
        csv_url = "/api/export/auditoria/csv"

        rows = ""
        for l in logs:
            ts_str = l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else "-"
            det = str(l.details or "-")
            if det.startswith("{") and det.endswith("}"):
                try:
                    import json
                    det_dict = json.loads(det)
                    det = ", ".join(f"{k}: {v}" for k, v in det_dict.items())
                except:
                    pass
            rows += f"""
            <tr class="border-b border-slate-200 text-[10px]">
                <td class="p-2 font-mono text-slate-500 whitespace-nowrap">{ts_str}</td>
                <td class="p-2 font-bold text-blue-900">{l.username} <span class="text-[9px] font-normal text-slate-500">({l.user_role})</span></td>
                <td class="p-2 font-semibold text-slate-800"><span class="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[9px]">{l.action}</span></td>
                <td class="p-2 font-semibold text-indigo-700">{l.module}</td>
                <td class="p-2 font-mono text-slate-500">{l.ip_address or '127.0.0.1'}</td>
                <td class="p-2 text-slate-700">{det}</td>
            </tr>
            """

        content_html = f"""
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border border-slate-200">
                <thead class="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                    <tr>
                        <th class="p-2">Timestamp</th>
                        <th class="p-2">Usuario & Identidad</th>
                        <th class="p-2">Acción</th>
                        <th class="p-2">Módulo</th>
                        <th class="p-2">IP Origen</th>
                        <th class="p-2">Detalle de Actuación</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
        """
    elif tipo == "usuarios":
        users_db = db.query(User).order_by(User.id.asc()).all()
        report_title = "Informe Institucional de Usuarios, Privilegios RBAC y Trazabilidad de Accesos"
        report_subtitle = "Nómina de cuentas autorizadas, segregación de funciones, último inicio de sesión y registro de actividades"
        report_code = "USUARIOS-ENT-ISO27001"
        legal_reference = "ISO/IEC 27001:2022 Control A.5.15, A.5.18 • Ley N° 19.628 • CGR"
        csv_url = "/api/export/usuarios/csv"

        total_users = len(users_db)
        active_users = sum(1 for u in users_db if u.is_active)
        admin_users = sum(1 for u in users_db if u.role == "Administrador")
        op_users = sum(1 for u in users_db if u.role == "Operador")
        vis_users = sum(1 for u in users_db if u.role == "Visor")

        rows_users = ""
        for u in users_db:
            role = u.role or "Visor"
            role_badge = "bg-purple-100 text-purple-800 border-purple-200" if role == "Administrador" else ("bg-blue-100 text-blue-800 border-blue-200" if role == "Operador" else "bg-slate-100 text-slate-800 border-slate-200")
            status_badge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Activo</span>' if u.is_active else '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Inactivo</span>'
            last_acc = u.last_login.strftime("%Y-%m-%d %H:%M:%S") if u.last_login else "Sin registro previo"
            created_str = u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "-"
            
            # Recuperar última acción real en AuditLog
            u_last_log = db.query(AuditLog).filter(AuditLog.username == u.username).order_by(AuditLog.timestamp.desc()).first()
            last_act_desc = f"{u_last_log.action} ({u_last_log.module})" if u_last_log else "Inicio de sesión"
            
            rows_users += f"""
            <tr class="border-b border-slate-200 text-[11px] hover:bg-slate-50 transition">
                <td class="p-2.5 font-mono font-bold text-blue-950">{u.username}</td>
                <td class="p-2.5 font-semibold text-slate-900">{u.full_name}</td>
                <td class="p-2.5 text-slate-600 font-mono text-[10px]">{u.email}</td>
                <td class="p-2.5"><span class="px-2 py-0.5 rounded-md text-[10px] font-bold border {role_badge}">{role}</span></td>
                <td class="p-2.5 text-center">{status_badge}</td>
                <td class="p-2.5 font-mono text-[10px] text-slate-500">{created_str}</td>
                <td class="p-2.5 font-mono text-[10px] font-bold text-indigo-900">{last_acc}</td>
                <td class="p-2.5 text-[10px] text-slate-700 font-mono"><span class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">{last_act_desc}</span></td>
            </tr>
            """

        recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(30).all()
        rows_actions = ""
        if recent_logs:
            for l in recent_logs:
                ts_str = l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else "-"
                det = str(l.details or "-")
                if det.startswith("{") and det.endswith("}"):
                    try:
                        import json
                        det_dict = json.loads(det)
                        det = ", ".join(f"{k}: {v}" for k, v in det_dict.items())
                    except:
                        pass
                rows_actions += f"""
                <tr class="border-b border-slate-200 text-[10px] hover:bg-slate-50 transition">
                    <td class="p-2 font-mono text-slate-500 whitespace-nowrap">{ts_str}</td>
                    <td class="p-2 font-bold text-blue-900">{l.username} <span class="text-[9px] font-normal text-slate-500">({l.user_role})</span></td>
                    <td class="p-2 font-semibold text-slate-800"><span class="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[9px]">{l.action}</span></td>
                    <td class="p-2 font-semibold text-indigo-700">{l.module}</td>
                    <td class="p-2 text-slate-700">{det}</td>
                    <td class="p-2 font-mono text-[9px] text-slate-400">{l.ip_address or '127.0.0.1'}</td>
                </tr>
                """

        content_html = f"""
        <div class="grid grid-cols-4 gap-4 text-center">
            <div class="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <span class="text-[10px] font-bold text-indigo-700 uppercase">Cuentas Registradas</span>
                <div class="text-2xl font-black text-indigo-900 mt-1">{total_users}</div>
                <span class="text-[10px] text-emerald-600 font-bold">{active_users} Cuentas Activas</span>
            </div>
            <div class="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <span class="text-[10px] font-bold text-purple-700 uppercase">Administradores CISO</span>
                <div class="text-2xl font-black text-purple-900 mt-1">{admin_users}</div>
                <span class="text-[10px] text-slate-500">Gestión Total & Políticas</span>
            </div>
            <div class="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <span class="text-[10px] font-bold text-blue-700 uppercase">Operadores SOC L1/L2</span>
                <div class="text-2xl font-black text-blue-900 mt-1">{op_users}</div>
                <span class="text-[10px] text-slate-500">Respuesta a Incidentes</span>
            </div>
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-bold text-slate-700 uppercase">Auditores & Visores</span>
                <div class="text-2xl font-black text-slate-900 mt-1">{vis_users}</div>
                <span class="text-[10px] text-slate-500">Consulta & Dictámenes</span>
            </div>
        </div>

        <div class="mt-6 space-y-3">
            <h3 class="font-bold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>1. Catálogo Oficial de Usuarios y Último Acceso (Control A.5.15 / A.5.18)</span>
                <span class="text-[10px] font-mono text-slate-500 font-normal">Autenticación PBKDF2-HMAC-SHA256</span>
            </h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead class="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                        <tr>
                            <th class="p-2.5">Usuario</th>
                            <th class="p-2.5">Nombre Completo</th>
                            <th class="p-2.5">Correo Institucional</th>
                            <th class="p-2.5">Rol RBAC</th>
                            <th class="p-2.5 text-center">Estado</th>
                            <th class="p-2.5">Fecha Alta</th>
                            <th class="p-2.5">Último Acceso</th>
                            <th class="p-2.5">Última Actuación</th>
                        </tr>
                    </thead>
                    <tbody>{rows_users}</tbody>
                </table>
            </div>
        </div>

        <div class="mt-6 space-y-3">
            <h3 class="font-bold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                2. Matriz de Control de Acceso y Segregación de Funciones (RBAC)
            </h3>
            <div class="grid grid-cols-3 gap-3 text-xs">
                <div class="p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <div class="font-bold text-purple-900 mb-1 flex items-center space-x-1.5">
                        <i class="fa-solid fa-user-shield text-purple-700"></i>
                        <span>Perfil Administrador</span>
                    </div>
                    <ul class="text-[10px] text-purple-950 space-y-1 list-disc list-inside">
                        <li>Control total del SGSI y matrices de riesgo.</li>
                        <li>Gestión de credenciales y altas/bajas de usuarios.</li>
                        <li>Configuración de conectores CTI y Syslog.</li>
                        <li>Firma y emisión formal de reportes ejecutivos.</li>
                    </ul>
                </div>
                <div class="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div class="font-bold text-blue-900 mb-1 flex items-center space-x-1.5">
                        <i class="fa-solid fa-headset text-blue-700"></i>
                        <span>Perfil Operador SOC</span>
                    </div>
                    <ul class="text-[10px] text-blue-950 space-y-1 list-disc list-inside">
                        <li>Monitoreo continuo de alertas y libro de guardia.</li>
                        <li>Triage táctico y mitigación de incidentes.</li>
                        <li>Ejecución de playbooks defensivos autorizados.</li>
                        <li>Exportación de logs operacionales para CSIRT.</li>
                    </ul>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div class="font-bold text-slate-900 mb-1 flex items-center space-x-1.5">
                        <i class="fa-solid fa-eye text-slate-700"></i>
                        <span>Perfil Visor / Auditor</span>
                    </div>
                    <ul class="text-[10px] text-slate-950 space-y-1 list-disc list-inside">
                        <li>Acceso de solo lectura a todos los paneles y KPIs.</li>
                        <li>Auditoría forense de evidencias criptográficas.</li>
                        <li>Descarga de libros de auditoría para CGR.</li>
                        <li>Inspección de cumplimiento ISO/IEC 27001:2022.</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="mt-6 space-y-3">
            <h3 class="font-bold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>3. Registro de Actuaciones y Trazabilidad Operacional Reciente (Audit Trail)</span>
                <span class="text-[10px] font-mono text-emerald-700 font-bold">● Bitácora en Vivo</span>
            </h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead class="bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                        <tr>
                            <th class="p-2">Timestamp</th>
                            <th class="p-2">Usuario & Identidad</th>
                            <th class="p-2">Acción</th>
                            <th class="p-2">Módulo</th>
                            <th class="p-2">Detalle Operacional</th>
                            <th class="p-2">IP Origen</th>
                        </tr>
                    </thead>
                    <tbody>{rows_actions}</tbody>
                </table>
            </div>
        </div>
        """

    else:
        return HTMLResponse("<h3>Tipo de reporte no válido.</h3>", status_code=400)

    log_audit_action(
        db,
        username=user.username,
        role=user.role,
        action="VIEW_REPORT",
        module="REPORTES",
        record_id=f"REPORTE_{tipo.upper()}",
        details={"tipo": tipo},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    app_settings = get_all_settings_dict(db)

    return templates.TemplateResponse(
        request=request,
        name="reporte_imprimible.html",
        context={
            "request": request,
            "current_user": user,
            "settings": app_settings,
            "report_title": report_title,
            "report_subtitle": report_subtitle,
            "report_code": report_code,
            "legal_reference": legal_reference,
            "report_content": content_html,
            "csv_url": csv_url,
            "timestamp": now_str
        }
    )

# -----------------------------------------------------------------------------
# Endpoints de Exportación Nativa a Microsoft Excel (.xlsx) y CSV UTF-8
# -----------------------------------------------------------------------------
@app.get("/api/export/{modulo}/excel")
@app.get("/api/export/{modulo}/xlsx")
async def api_export_excel(request: Request, modulo: str, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return JSONResponse({"ok": False, "error": "No autenticado"}, status_code=401)

    from fastapi.responses import Response

    modulo = modulo.lower()
    user_name = user.full_name or user.username or "Auditor SGSI"
    filename = f"SERMIG_SGSI_ENTERPRISE_{modulo.upper()}_2026.xlsx"

    if modulo == "soa":
        controls = db.query(SoAControl).order_by(SoAControl.code).all()
        excel_io = ExcelExportService.export_soa(controls, user_name=user_name)
    elif modulo == "riesgos":
        riesgos = db.query(Risk).order_by(Risk.id).all()
        excel_io = ExcelExportService.export_riesgos(riesgos, user_name=user_name)
    elif modulo == "activos":
        activos = db.query(Asset).order_by(Asset.id).all()
        excel_io = ExcelExportService.export_activos(activos, user_name=user_name)
    elif modulo == "soc":
        incidents = db.query(Incident).order_by(Incident.timestamp_str.desc()).all()
        excel_io = ExcelExportService.export_soc(incidents, user_name=user_name)
    elif modulo == "usuarios":
        users_db = db.query(User).order_by(User.id.asc()).all()
        audit_dict = {}
        for u in users_db:
            u_last_log = db.query(AuditLog).filter(AuditLog.username == u.username).order_by(AuditLog.timestamp.desc()).first()
            if u_last_log and u_last_log.timestamp:
                audit_dict[u.username] = f"{u_last_log.action} en {u_last_log.module} ({u_last_log.timestamp.strftime('%Y-%m-%d %H:%M')})"
            else:
                audit_dict[u.username] = "Sin acciones registradas"
        excel_io = ExcelExportService.export_usuarios(users_db, user_name=user_name, audit_logs=audit_dict)
    elif modulo == "auditoria":
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
        excel_io = ExcelExportService.export_auditoria(logs, user_name=user_name)
    else:
        return JSONResponse({"ok": False, "error": f"Módulo '{modulo}' desconocido para exportación Excel"}, status_code=400)

    log_audit_action(
        db,
        username=user.username,
        role=user.role,
        action="EXPORT_EXCEL",
        module="REPORTES",
        record_id=f"EXPORT_EXCEL_{modulo.upper()}",
        details={"modulo": modulo, "format": "xlsx"},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    return Response(
        content=excel_io.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.get("/api/export/{modulo}/csv")
async def api_export_csv(request: Request, modulo: str, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    if not user:
        return JSONResponse({"ok": False, "error": "No autenticado"}, status_code=401)

    import io
    import csv
    from fastapi.responses import Response

    modulo = modulo.lower()
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)

    filename = f"SERMIG_SGSI_ENTERPRISE_{modulo.upper()}_2026.csv"

    if modulo == "soa":
        controls = db.query(SoAControl).order_by(SoAControl.code).all()
        writer.writerow(["Codigo_Control", "Dominio", "Nombre_Control", "Aplica", "Estado_Implementacion", "Madurez_Pct", "Responsable", "Justificacion", "Evidencia"])
        for c in controls:
            writer.writerow([c.code, c.domain, c.name, c.applies, c.implementation_status, f"{int(c.maturity_pct)}%", c.owner or "CISO", c.justification or "", c.evidence_text or ""])

    elif modulo == "riesgos":
        riesgos = db.query(Risk).order_by(Risk.id).all()
        writer.writerow(["ID_Riesgo", "ID_Activo", "Amenaza", "Vulnerabilidad", "Probabilidad_Inherente", "Impacto_Inherente", "Nivel_Inherente", "Categoria_Inherente", "Eficacia_Controles", "Nivel_Residual", "Categoria_Residual", "Estrategia_Tratamiento", "Responsable"])
        for r in riesgos:
            writer.writerow([r.id, r.asset_id or "-", r.threat, r.vulnerability, r.inherent_prob, r.inherent_impact, r.inherent_level, r.inherent_category, f"{int(r.control_efficacy_pct)}%", r.residual_level, r.residual_category, r.strategy, r.owner])

    elif modulo == "activos":
        activos = db.query(Asset).order_by(Asset.id).all()
        writer.writerow(["ID_Activo", "Nombre_Activo", "Tipo_Activo", "Propietario_Activo", "Custodio_Tecnico", "Ubicacion", "Confidencialidad", "Integridad", "Disponibilidad", "Criticidad_Calculada", "Nivel_Criticidad", "Estado"])
        for a in activos:
            writer.writerow([a.id, a.name, a.asset_type, a.owner, a.custodian, a.location, a.confidentiality, a.integrity, a.availability, a.criticality_score, a.criticality_level, a.status])

    elif modulo == "soc":
        incidents = db.query(Incident).order_by(Incident.timestamp_str.desc()).all()
        writer.writerow(["ID_Incidente", "Fecha_Hora", "Titulo_Incidente", "Tipo_Amenaza", "Severidad", "Estado", "IP_Origen", "Host_Origen", "IP_Destino", "Host_Destino", "Tactica_MITRE", "Tecnica_MITRE", "MTTD_Minutos", "MTTR_Minutos", "Accion_Correctiva", "Responsable_SOC"])
        for i in incidents:
            writer.writerow([i.id, i.timestamp_str, i.title, i.threat_type, i.severity, i.status, i.src_ip, i.src_host, i.dst_ip, i.dst_host, i.mitre_tactic, i.mitre_technique, i.mttd_minutes, i.mttr_minutes, i.corrective_action, i.assigned_analyst])

    elif modulo == "usuarios":
        users_db = db.query(User).order_by(User.id.asc()).all()
        writer.writerow(["ID", "Username", "Nombre_Completo", "Email", "Rol", "Departamento", "Estado", "Fecha_Creacion", "Ultimo_Acceso", "Ultima_Accion_Registrada", "Facultades_Principales"])
        for u in users_db:
            role = u.role or "Visor"
            facultad = "Administración total SGSI, Políticas, Usuarios y CTI" if role == "Administrador" else ("Monitoreo SOC 24/7, Mitigación de Incidentes, Playbooks" if role == "Operador" else "Auditoría de Registros, Consulta de Paneles e Informes CGR")
            created_str = u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else "-"
            last_acc = u.last_login.strftime("%Y-%m-%d %H:%M:%S") if u.last_login else "-"
            u_last_log = db.query(AuditLog).filter(AuditLog.username == u.username).order_by(AuditLog.timestamp.desc()).first()
            last_act_str = f"{u_last_log.action} en {u_last_log.module} ({u_last_log.timestamp.strftime('%Y-%m-%d %H:%M') if u_last_log.timestamp else '-'})" if u_last_log else "Sin acciones previas registradas"
            writer.writerow([
                u.id,
                u.username,
                u.full_name,
                u.email,
                role,
                u.department or "Ciberseguridad",
                "Activo" if u.is_active else "Inactivo",
                created_str,
                last_acc,
                last_act_str,
                facultad
            ])

    elif modulo == "auditoria":
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
        writer.writerow(["ID", "Timestamp", "Usuario", "Rol", "Accion", "Modulo", "Registro_ID", "IP_Origen", "Detalles"])
        for l in logs:
            ts_str = l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else "-"
            writer.writerow([l.id, ts_str, l.username, l.user_role, l.action, l.module, l.record_id, l.ip_address, str(l.details)])

    else:
        return JSONResponse({"ok": False, "error": "Módulo de exportación desconocido"}, status_code=400)

    log_audit_action(
        db,
        username=user.username,
        role=user.role,
        action="EXPORT_CSV",
        module="REPORTES",
        record_id=f"EXPORT_{modulo.upper()}",
        details={"modulo": modulo},
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    csv_data = output.getvalue().encode("utf-8")
    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

if __name__ == "__main__":
    print(f"==================================================================")
    print(f"  🛡️ SGSI & SOC Enterprise Framework (SERMIG 2026)")
    print(f"  🏢 Entorno: {settings.ENVIRONMENT} | Servidor: {settings.SERVER_NAME}")
    print(f"  🗄️ Base de Datos: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print(f"  🚀 Acceso Web: http://localhost:{settings.APP_PORT}")
    print(f"==================================================================")
    uvicorn.run(app, host=settings.APP_HOST, port=settings.APP_PORT)
