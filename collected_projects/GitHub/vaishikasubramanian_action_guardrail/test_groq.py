from app.agent.groq_agent import generate_tool_call

response = generate_tool_call(
    "Delete 500 customer records"
)

print(response)