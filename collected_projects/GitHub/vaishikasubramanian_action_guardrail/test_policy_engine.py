from app.guardrail.policy_engine import PolicyEngine
from app.schemas.action_request import ActionRequest

engine = PolicyEngine()

request = ActionRequest(
    agent_id="agent_001",
    tool_name="database_tool",
    action="delete_records",
    parameters={
      "record_count": 5
    }
)

result = engine.evaluate(request)

print(result)