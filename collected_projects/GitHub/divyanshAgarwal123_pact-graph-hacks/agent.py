"""A bounded local agent over PACT's MCP graph tools and guarded proposal action."""

import asyncio
import json
import os
from urllib.request import Request, urlopen

from mcp import Client

from mcp_server import create_server
from pact import GOAL_ID, revision, save_proposal


MODEL = os.getenv("PACT_MODEL", "qwen3:8b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
TOOL_NAMES = ("inspect_connections", "check_schedule", "recall_failure")
TOOLS = [{"type": "function", "function": {
    "name": name, "description": description,
    "parameters": {"type": "object", "properties": {}, "required": []}}}
    for name, description in (
        ("inspect_connections", "Read the current goal, requirements, active offers, and their organizations from FalkorDB"),
        ("check_schedule", "Solve and independently check the current synthetic schedule"),
        ("recall_failure", "Read a prior provider failure from FalkorDB and check if it applies to the current offer"),
    )]
ACTION_TOOL = [{"type": "function", "function": {
    "name": "record_pending_proposal",
    "description": "Record the independently checked plan in FalkorDB as pending human review, only if the current graph revision is unchanged. This does not approve or reserve anything.",
    "parameters": {"type": "object", "properties": {}, "required": []}}}]


def _chat(messages, tools=None, format_schema=None):
    payload = {"model": MODEL, "messages": messages, "stream": False, "think": False,
               "options": {"temperature": 0, "num_predict": 256}}
    if tools is not None:
        payload["tools"] = tools
    if format_schema is not None:
        payload["format"] = format_schema
    request = Request(OLLAMA_URL, data=json.dumps(payload).encode(),
                      headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=45) as response:
        return json.load(response)["message"]


async def _mcp_call(server, name):
    async with Client(server) as client:
        result = await client.call_tool(name, {})
    if result.is_error:
        raise RuntimeError(f"MCP graph tool failed: {name}")
    if result.structured_content is not None:
        return result.structured_content.get("result", result.structured_content)
    if len(result.content) == 1 and result.content[0].type == "text":
        return json.loads(result.content[0].text)
    raise RuntimeError(f"MCP graph tool returned unsupported content: {name}")


def review(g):
    """Run bounded tools; record only a checked, revision-bound pending proposal."""
    starting_revision = revision(g)
    mcp_server = create_server(lambda: g)
    messages = [
        {"role": "system", "content": (
            "You are PACT's coordinator for a synthetic scenario. Inspection tools are read-only. "
            "Call inspect_connections, check_schedule, and recall_failure before concluding. "
            "Use only those tool results. A past failure at a different rate may be obsolete. "
            "Never claim a proposal is approved, reserved, or physically completed. "
            "You can call more than one tool in a turn.")},
        {"role": "user", "content": (
            "Can the school receive 20 prepared laptops by 15:00? "
            "Should W2's earlier capacity failure block its current offer?")},
    ]
    executed = {}
    trace = []
    empty_retry = False
    for _ in range(4):
        if len(executed) == len(TOOL_NAMES):
            break
        answer = _chat(messages, tools=TOOLS)
        calls = answer.get("tool_calls", [])
        if not calls:
            if not executed and not answer.get("content") and not empty_retry:
                messages.append({"role": "user", "content":
                    "Call inspect_connections, check_schedule, and recall_failure now."})
                empty_retry = True
                continue
            break
        messages.append(answer)
        for call in calls:
            name = call.get("function", {}).get("name")
            if name not in TOOL_NAMES:
                return {"status": "unresolved", "reason": "Model requested an unsupported tool", "trace": trace}
            result = asyncio.run(_mcp_call(mcp_server, name))
            executed[name] = result
            trace.append(name)
            messages.append({"role": "tool", "tool_name": name,
                             "content": json.dumps(result)})
    if set(executed) != set(TOOL_NAMES):
        return {"status": "unresolved", "reason": "Required graph tools were not called", "trace": trace}
    if revision(g) != starting_revision:
        return {"status": "unresolved", "reason": "Graph changed during review; retry", "trace": trace}

    schema = {"type": "object", "properties": {
        "why": {"type": "string"},
        "evidence_ids": {"type": "array", "items": {"type": "string"}},
    }, "required": ["why", "evidence_ids"]}
    messages.append({"role": "user", "content": (
        "Return one JSON note about the checked proposal and the old W2 episode. "
        "Keep why under 35 words. Cite offer IDs or episode IDs. "
        "Describe a synthetic proposal, never an approval or completed delivery.")})
    draft = json.loads(_chat(messages, format_schema=schema)["content"])
    messages.append({"role": "assistant", "content": json.dumps(draft)})
    checked = executed["check_schedule"]
    history = executed["recall_failure"]
    expected_recommendation = ("present_plan" if checked["status"] == "feasible_within_model"
                               else "unresolved" if checked["status"] == "unresolved"
                               else "seek_new_offer")
    expected_memory = ("applicable" if history and history[0]["applicable_now"] else
                       "obsolete" if history else "none")
    valid_ids = {GOAL_ID}
    valid_ids.update(row["offer_id"] for row in executed["inspect_connections"]["candidate_offers"])
    valid_ids.update(row["episode_id"] for row in history)
    if (not draft["evidence_ids"] or not set(draft["evidence_ids"]).issubset(valid_ids)
            or len(draft["why"]) > 240):
        return {"status": "unresolved", "reason": "Model cited unknown evidence or exceeded the review limit",
                "trace": trace, "checked_plan": checked["status"]}
    if checked["status"] == "feasible_within_model" and expected_memory == "obsolete":
        explanation = "The current W2 rate supersedes its old 5/hour failure; the checked proposal meets the deadline."
    elif checked["status"] == "blocked" and expected_memory == "applicable":
        explanation = "W2's current rate matches its earlier failed rate, and the schedule checker found no feasible continuation."
    else:
        explanation = "Recommendation follows the current graph facts and the independent schedule check."
    proposal_id = None
    if expected_recommendation == "present_plan":
        messages.append({"role": "user", "content": (
            "The independently checked plan is feasible under current synthetic facts. "
            "If the graph evidence supports handing this plan to a person, call "
            "record_pending_proposal. This records only a pending review item, not an approval.")})
        action = _chat(messages, tools=ACTION_TOOL)
        calls = action.get("tool_calls", [])
        if len(calls) != 1 or calls[0].get("function", {}).get("name") != "record_pending_proposal":
            return {"status": "unresolved", "reason": "Agent did not request the bounded proposal action",
                    "trace": trace}
        selected = [offer["id"] for offer in checked["selected_offers"].values()]
        evidence = sorted(set(draft["evidence_ids"]) | set(selected))
        proposal_id = save_proposal(g, starting_revision, selected,
                                    checked["delivery_by_minute"], evidence)
        if proposal_id is None:
            return {"status": "unresolved", "reason": "Graph changed before proposal write; retry",
                    "trace": trace}
        trace.append("record_pending_proposal")
    return {"status": "reviewed", "recommendation": expected_recommendation,
            "memory_assessment": expected_memory, "explanation": explanation,
            "evidence_ids": draft["evidence_ids"], "trace": trace,
            "checked_plan": checked["status"], "model": MODEL,
            "proposal_id": proposal_id, "revision": starting_revision,
            "disclaimer": "Synthetic pending proposal only; no approval or external action"}
