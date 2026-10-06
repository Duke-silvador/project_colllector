import logging
import time
import os
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from app.api.routes import router
from app.database.database import Base, engine, SessionLocal
from app.models.audit_log_model import AuditLog
from app.models.hitl_request_model import HITLRequest
from app.models.policy_history_model import PolicyHistory
from app.models.policy_model import Policy
from app.models.user_model import User
from app.models.agent_model import Agent
from app.logs.audit_logger import get_logs
from app.policies.policy_seed import seed_policies
from app.guardrail.policy_engine import PolicyEngine
from app.security.user_seed import seed_admin
from app.security.security import verify_password
from app.security.jwt_handler import create_access_token
from app.security.auth_dependency import get_current_user
from app.agents.agent_seed import seed_agents

load_dotenv()

# -------------------------------------------------------
# Structured Logging Setup
# -------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S"
)

logger = logging.getLogger("action_guardrail")

# -------------------------------------------------------
# Database Initialization
# -------------------------------------------------------

Base.metadata.create_all(bind=engine)
logger.info("Database tables created/verified.")

seed_policies()
seed_admin()
seed_agents()
logger.info("Seed data applied.")

# -------------------------------------------------------
# App Instance
# -------------------------------------------------------

app = FastAPI(
    title="Action Guardrail API",
    description="Pre-execution AI governance layer — enforces policy at the moment a tool call is about to execute.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# -------------------------------------------------------
# CORS
# -------------------------------------------------------

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
)

# If * is set, allow all origins
if ALLOWED_ORIGINS.strip() == "*":
    origins_list = ["*"]
else:
    origins_list = [o.strip() for o in ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------
# Request Logging Middleware
# -------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)
    logger.info(
        f"{request.method} {request.url.path} "
        f"-> {response.status_code} ({duration_ms}ms)"
    )
    return response

# -------------------------------------------------------
# Global Exception Handler
# -------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An internal server error occurred."
        }
    )

# -------------------------------------------------------
# Include Routers
# -------------------------------------------------------

app.include_router(router)

# -------------------------------------------------------
# Request Models
# -------------------------------------------------------

class PolicyUpdateRequest(BaseModel):
    value: int
    decision: str

class SimulationRequest(BaseModel):
    action: str
    parameters: dict

class LoginRequest(BaseModel):
    username: str
    password: str

class RoleUpdateRequest(BaseModel):
    role: str

class ToolUpdateRequest(BaseModel):
    allowed_tools: list[str]

# -------------------------------------------------------
# Root
# -------------------------------------------------------

@app.get("/", tags=["System"])
def root():
    return {
        "project": "Action Guardrail",
        "description": "Pre-execution governance for AI agent tool calls",
        "version": "1.0.0",
        "docs": "/docs"
    }

# -------------------------------------------------------
# Policies
# -------------------------------------------------------

@app.get("/policies", tags=["Policies"])
def get_policies():
    db = SessionLocal()
    try:
        policies = db.query(Policy).all()
        return {"rules": policies}
    finally:
        db.close()


@app.put("/policies/{rule_id}", tags=["Policies"])
def update_policy(
    rule_id: str,
    request: PolicyUpdateRequest,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admins can modify policies."
        )

    db = SessionLocal()
    try:
        policy = db.query(Policy).filter(Policy.rule_id == rule_id).first()

        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")

        history = PolicyHistory(
            rule_id=policy.rule_id,
            old_value=str(policy.value),
            new_value=str(request.value),
            old_decision=policy.decision,
            new_decision=request.decision,
            timestamp=datetime.now().isoformat()
        )
        db.add(history)

        policy.value = str(request.value)
        policy.decision = request.decision
        db.commit()

        logger.info(f"Policy {rule_id} updated by {current_user['sub']}")
        return {"status": "success", "message": "Policy updated successfully"}
    finally:
        db.close()


@app.patch("/policies/{rule_id}/toggle", tags=["Policies"])
def toggle_policy(
    rule_id: str,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admins can toggle policies."
        )

    db = SessionLocal()
    try:
        policy = db.query(Policy).filter(Policy.rule_id == rule_id).first()

        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")

        policy.enabled = not policy.enabled
        db.commit()

        logger.info(
            f"Policy {rule_id} {'enabled' if policy.enabled else 'disabled'} "
            f"by {current_user['sub']}"
        )
        return {
            "status": "success",
            "enabled": policy.enabled,
            "message": f"{rule_id} updated successfully"
        }
    finally:
        db.close()

# -------------------------------------------------------
# Policy History
# -------------------------------------------------------

@app.get("/policy-history", tags=["Policies"])
def get_policy_history():
    db = SessionLocal()
    try:
        history = db.query(PolicyHistory).order_by(PolicyHistory.id.desc()).all()
        return history
    finally:
        db.close()


@app.post("/policy-history/rollback/{history_id}", tags=["Policies"])
def rollback_policy(
    history_id: int,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admins can rollback policies."
        )

    db = SessionLocal()
    try:
        history = db.query(PolicyHistory).filter(
            PolicyHistory.id == history_id
        ).first()

        if not history:
            raise HTTPException(status_code=404, detail="History record not found")

        policy = db.query(Policy).filter(Policy.rule_id == history.rule_id).first()

        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")

        policy.value = history.old_value
        policy.decision = history.old_decision
        db.commit()

        logger.info(
            f"Policy {history.rule_id} rolled back to history #{history_id} "
            f"by {current_user['sub']}"
        )
        return {"status": "success", "message": "Rollback successful"}
    finally:
        db.close()

# -------------------------------------------------------
# Metrics
# -------------------------------------------------------

@app.get("/metrics", tags=["System"])
def get_metrics():
    logs = get_logs()
    total = len(logs)
    blocked = sum(1 for log in logs if log.decision == "block")
    hitl = sum(1 for log in logs if log.decision == "require_hitl")
    allowed = sum(1 for log in logs if log.decision in ["allow", "log_and_allow"])

    return {
        "total": total,
        "blocked": blocked,
        "hitl": hitl,
        "allowed": allowed
    }

# -------------------------------------------------------
# Policy Simulator
# -------------------------------------------------------

@app.post("/simulate", tags=["Policies"])
def simulate_action(request: SimulationRequest):

    policy_engine = PolicyEngine()

    class MockAction:
        pass

    mock = MockAction()
    mock.agent_id = "simulation_agent"
    mock.tool_name = "simulation_tool"
    mock.action = request.action
    mock.parameters = request.parameters

    result = policy_engine.evaluate(mock)

    return {
        "simulation": True,
        "decision": result["decision"],
        "matched_rule": result["rule_id"],
        "agent": result.get("agent"),
        "explanations": result.get("explanations", [])
    }

# -------------------------------------------------------
# Auth
# -------------------------------------------------------

@app.post("/login", tags=["Auth"])
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == request.username).first()

        if not user or not verify_password(request.password, user.password):
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials"
            )

        if not user.enabled:
            raise HTTPException(
                status_code=403,
                detail="Your account has been disabled."
            )

        token = create_access_token({"sub": user.username, "role": user.role})

        logger.info(f"User '{user.username}' logged in.")

        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "username": user.username
        }
    finally:
        db.close()

# -------------------------------------------------------
# Users
# -------------------------------------------------------

@app.get("/users", tags=["Users"])
def get_users(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view users.")

    db = SessionLocal()
    try:
        users = db.query(User).all()
        return {
            "users": [
                {
                    "id": u.id,
                    "username": u.username,
                    "role": u.role,
                    "enabled": u.enabled
                }
                for u in users
            ]
        }
    finally:
        db.close()


@app.patch("/users/{user_id}/toggle", tags=["Users"])
def toggle_user(user_id: int, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage users.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.username == current_user["sub"]:
            raise HTTPException(
                status_code=400,
                detail="You cannot disable your own account."
            )

        user.enabled = not user.enabled
        db.commit()

        logger.info(
            f"User '{user.username}' {'enabled' if user.enabled else 'disabled'} "
            f"by {current_user['sub']}"
        )
        return {
            "status": "success",
            "enabled": user.enabled,
            "message": f"User {user.username} updated successfully"
        }
    finally:
        db.close()


@app.put("/users/{user_id}/role", tags=["Users"])
def update_role(
    user_id: int,
    request: RoleUpdateRequest,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change roles.")

    allowed_roles = ["admin", "reviewer", "auditor"]
    if request.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        old_role = user.role
        user.role = request.role
        db.commit()

        logger.info(
            f"User '{user.username}' role changed from {old_role} to {request.role} "
            f"by {current_user['sub']}"
        )
        return {
            "status": "success",
            "message": f"{user.username} role updated to {request.role}"
        }
    finally:
        db.close()

# -------------------------------------------------------
# Agents
# -------------------------------------------------------

@app.get("/agents", tags=["Agents"])
def get_agents(current_user=Depends(get_current_user)):
    if current_user["role"] not in ["admin", "reviewer", "auditor"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    db = SessionLocal()
    try:
        agents = db.query(Agent).all()
        return {
            "agents": [
                {
                    "id": a.id,
                    "agent_name": a.agent_name,
                    "description": a.description,
                    "allowed_tools": a.allowed_tools,
                    "enabled": a.enabled
                }
                for a in agents
            ]
        }
    finally:
        db.close()


@app.patch("/agents/{agent_id}/toggle", tags=["Agents"])
def toggle_agent(agent_id: int, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage agents.")

    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()

        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        agent.enabled = not agent.enabled
        db.commit()

        logger.info(
            f"Agent '{agent.agent_name}' {'enabled' if agent.enabled else 'disabled'} "
            f"by {current_user['sub']}"
        )
        return {"status": "success", "enabled": agent.enabled}
    finally:
        db.close()


@app.put("/agents/{agent_id}/tools", tags=["Agents"])
def update_agent_tools(
    agent_id: int,
    request: ToolUpdateRequest,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admins can modify agent tools."
        )

    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()

        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found.")

        agent.allowed_tools = ",".join(request.allowed_tools)
        db.commit()

        logger.info(
            f"Agent '{agent.agent_name}' tools updated by {current_user['sub']}"
        )
        return {
            "status": "success",
            "message": f"{agent.agent_name} tools updated successfully."
        }
    finally:
        db.close()
