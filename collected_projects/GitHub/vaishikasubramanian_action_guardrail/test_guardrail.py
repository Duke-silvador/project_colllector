from app.guardrail.action_guardrail import ActionGuardrail
from app.schemas.action_request import ActionRequest
from app.hitl.hitl_manager import get_pending_requests

guardrail = ActionGuardrail()

request = ActionRequest(
    agent_id="agent_001",
    tool_name="database_tool",
    action="delete_records",
    parameters={
        "record_count": 500
    }
)

result = guardrail.execute(request)
print(result)
from app.logs.audit_logger import get_logs

print("\nAudit Logs:")
print(get_logs())

print("\nPending Requests:")
print(get_pending_requests())