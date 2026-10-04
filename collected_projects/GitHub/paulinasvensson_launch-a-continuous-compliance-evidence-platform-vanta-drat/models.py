from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String)
    employee_count = Column(Integer)
    target_markets = Column(String)  # comma-separated e.g. "EU,CA,VA"
    created_at = Column(DateTime, default=datetime.utcnow)


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    provider = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default="pending")
    last_synced_at = Column(DateTime, nullable=True)
    access_token_encrypted = Column(String, default="mock-token")


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    category = Column(String)
    source_system = Column(String)
    raw_data = Column(JSON)
    collected_at = Column(DateTime, default=datetime.utcnow)


class ComplianceDocument(Base):
    __tablename__ = "compliance_documents"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    doc_type = Column(String)
    jurisdiction = Column(String)
    title = Column(String)
    content = Column(Text)
    status = Column(String, default="draft")
    generated_at = Column(DateTime, default=datetime.utcnow)
    last_reviewed_at = Column(DateTime, nullable=True)


class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    jurisdiction = Column(String)
    regulation = Column(String)
    requirement = Column(String)
    status = Column(String, default="open")
    due_date = Column(DateTime, nullable=True)
    evidence_ids = Column(JSON, default=list)
