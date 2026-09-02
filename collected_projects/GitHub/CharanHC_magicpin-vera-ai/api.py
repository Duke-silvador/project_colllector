from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException

from bot import compose
from conversation_handlers import (
    ConversationState,
    create_state,
    respond,
)


app = FastAPI(
    title="Magicpin Vera AI",
    version="1.0.0",
)


# ============================================================
# IN-MEMORY STORAGE
# ============================================================

contexts: dict[str, dict[str, dict[str, Any]]] = {
    "category": {},
    "merchant": {},
    "customer": {},
    "trigger": {},
}

conversations: dict[str, ConversationState] = {}


# ============================================================
# HEALTH
# ============================================================

@app.get("/v1/healthz")
def healthz():
    return {
        "status": "ok"
    }


# ============================================================
# METADATA
# ============================================================

@app.get("/v1/metadata")
def metadata():
    return {
        "team_name": "Magicpin Vera AI",
        "version": "1.0.0",
        "capabilities": [
            "merchant_composition",
            "customer_composition",
            "trigger_routing",
            "auto_reply_detection",
            "intent_handoff",
            "graceful_exit",
        ],
    }


# ============================================================
# CONTEXT
# ============================================================

@app.post("/v1/context")
def push_context(data: dict):

    scope = data.get("scope")
    context_id = data.get("context_id")
    payload = data.get("payload")

    if scope not in contexts:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown context scope: {scope}"
        )

    if not context_id:
        raise HTTPException(
            status_code=400,
            detail="context_id is required"
        )

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=400,
            detail="payload must be an object"
        )

    contexts[scope][context_id] = payload

    return {
        "accepted": True,
        "scope": scope,
        "context_id": context_id,
    }


# ============================================================
# LOOKUP HELPERS
# ============================================================

def find_merchant(merchant_id: str) -> dict | None:
    return contexts["merchant"].get(merchant_id)


def find_customer(customer_id: str | None) -> dict | None:

    if not customer_id:
        return None

    return contexts["customer"].get(customer_id)


def find_trigger(trigger_id: str) -> dict | None:
    return contexts["trigger"].get(trigger_id)


def find_category_for_merchant(
    merchant: dict
) -> dict | None:

    category_slug = merchant.get("category_slug")

    if not category_slug:
        category_slug = (
            merchant.get("identity", {})
            .get("category_slug")
        )

    if not category_slug:
        return None

    return contexts["category"].get(category_slug)


# ============================================================
# TICK
# ============================================================

@app.post("/v1/tick")
def tick(data: dict):

    available_triggers = data.get(
        "available_triggers",
        []
    )

    if not isinstance(
        available_triggers,
        list
    ):
        raise HTTPException(
            status_code=400,
            detail="available_triggers must be a list"
        )

    actions = []

    for trigger_id in available_triggers:

        trigger = find_trigger(trigger_id)

        if trigger is None:
            continue

        merchant_id = (
            trigger.get("merchant_id")
            or trigger.get("payload", {}).get("merchant_id")
        )

        if not merchant_id:
            continue

        merchant = find_merchant(
            merchant_id
        )

        if merchant is None:
            continue

        category = find_category_for_merchant(
            merchant
        )

        if category is None:
            continue

        customer_id = trigger.get(
            "customer_id"
        )

        customer = find_customer(
            customer_id
        )

        result = compose(
            category,
            merchant,
            trigger,
            customer,
        )

        actions.append({
            "trigger_id": trigger_id,
            "merchant_id": merchant_id,
            "customer_id": customer_id,
            **result,
        })

    return {
        "actions": actions
    }


# ============================================================
# REPLY
# ============================================================

@app.post("/v1/reply")
def reply(data: dict):

    conversation_id = data.get(
        "conversation_id"
    )

    merchant_message = data.get(
        "message"
    )

    if not conversation_id:
        raise HTTPException(
            status_code=400,
            detail="conversation_id is required"
        )

    if merchant_message is None:
        raise HTTPException(
            status_code=400,
            detail="message is required"
        )

    # Get or create conversation state.
    state = conversations.get(
        conversation_id
    )

    if state is None:
        state = create_state()

        conversations[
            conversation_id
        ] = state

    result = respond(
        state,
        str(merchant_message)
    )

    return result