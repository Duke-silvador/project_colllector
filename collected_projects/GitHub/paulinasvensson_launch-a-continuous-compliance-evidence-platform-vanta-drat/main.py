from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import get_db
from entitlements import require_pro
from frontend import PAGE_HTML
from services import sync as sync_service
from services import documents as document_service
from services import obligations as obligation_service

app = FastAPI(title="Continuous Compliance Evidence Platform")


class OrgCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    target_markets: Optional[str] = None  # e.g. "EU,CA,VA"


class IntegrationConnect(BaseModel):
    org_id: int
    provider: str
    type: str


class ObligationUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[datetime] = None


@app.get("/", response_class=HTMLResponse)
def home():
    return HTMLResponse(PAGE_HTML)


@app.post("/orgs")
def create_org(payload: OrgCreate, db: Session = Depends(get_db)):
    org = models.Organization(
        name=payload.name,
        industry=payload.industry,
        employee_count=payload.employee_count,
        target_markets=payload.target_markets,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    obligation_service.seed_default_obligations(db, org)
    return org


@app.post("/integrations/connect", dependencies=[Depends(require_pro)])
def connect_integration(payload: IntegrationConnect, db: Session = Depends(get_db)):
    org = db.query(models.Organization).get(payload.org_id)
    if not org:
        raise HTTPException(404, "organization not found")

    integration = models.Integration(
        org_id=org.id,
        provider=payload.provider,
        type=payload.type,
        status="connected",
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration


@app.post("/integrations/{integration_id}/sync", dependencies=[Depends(require_pro)])
def sync_integration_route(integration_id: int, db: Session = Depends(get_db)):
    integration = db.query(models.Integration).get(integration_id)
    if not integration:
        raise HTTPException(404, "integration not found")

    created = sync_service.sync_integration(db, integration)
    return {"synced_count": len(created), "evidence": created}


@app.get("/evidence", dependencies=[Depends(require_pro)])
def list_evidence(
    org_id: int,
    category: Optional[str] = None,
    since: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.EvidenceItem).filter(models.EvidenceItem.org_id == org_id)
    if category:
        query = query.filter(models.EvidenceItem.category == category)
    if since:
        query = query.filter(models.EvidenceItem.collected_at >= since)
    return query.order_by(models.EvidenceItem.collected_at.desc()).all()


@app.post("/documents/generate", dependencies=[Depends(require_pro)])
def generate_document_route(
    org_id: int,
    doc_type: str = "EU AI Act Technical Documentation",
    jurisdiction: str = "EU",
    db: Session = Depends(get_db),
):
    org = db.query(models.Organization).get(org_id)
    if not org:
        raise HTTPException(404, "organization not found")
    return document_service.generate_document(db, org, doc_type, jurisdiction)


@app.get("/documents/{doc_id}")
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.ComplianceDocument).get(doc_id)
    if not doc:
        raise HTTPException(404, "document not found")
    return doc


@app.get("/obligations", dependencies=[Depends(require_pro)])
def list_obligations(
    org_id: int,
    jurisdiction: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Obligation).filter(models.Obligation.org_id == org_id)
    if jurisdiction:
        query = query.filter(models.Obligation.jurisdiction == jurisdiction)
    if status:
        query = query.filter(models.Obligation.status == status)
    return query.all()


@app.patch("/obligations/{obligation_id}", dependencies=[Depends(require_pro)])
def update_obligation(obligation_id: int, payload: ObligationUpdate, db: Session = Depends(get_db)):
    obligation = db.query(models.Obligation).get(obligation_id)
    if not obligation:
        raise HTTPException(404, "obligation not found")

    if payload.status is not None:
        obligation.status = payload.status
    if payload.due_date is not None:
        obligation.due_date = payload.due_date

    db.commit()
    db.refresh(obligation)
    return obligation
