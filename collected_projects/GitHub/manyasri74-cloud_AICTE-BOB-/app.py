"""
Travel Planner Agent — Flask Web Application
IBM Granite + IBM Cloud Lite powered backend
"""

import os
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
from agent import TravelPlannerAgent

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "travel-agent-secret-key")
CORS(app)

# Global agent instance (one per server; session handles multi-user via memory reset)
_agent = TravelPlannerAgent()


@app.route("/")
def index():
    """Serve the main chat interface."""
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    POST /api/chat
    Body: { "message": "user message" }
    Returns: { "response": "agent response" }
    """
    data = request.get_json()
    if not data or not data.get("message"):
        return jsonify({"error": "Message is required"}), 400

    user_message = data["message"].strip()
    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    try:
        response = _agent.chat(user_message)
        return jsonify({"response": response, "status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e), "status": "error"}), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    """Reset the conversation history."""
    _agent.reset_conversation()
    return jsonify({"status": "ok", "message": "Conversation reset"})


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "agent": "Travel Planner Agent",
        "model": os.getenv("GRANITE_MODEL_ID", "ibm/granite-13b-chat-v2"),
        "ibm_configured": _agent.llm.is_configured(),
        "version": "1.0.0",
    })


@app.route("/api/quick-prompts", methods=["GET"])
def quick_prompts():
    """Return quick-start prompt suggestions."""
    prompts = [
        {"label": "🏖️ Beach Destinations", "text": "Suggest budget-friendly beach destinations for 7 days"},
        {"label": "🏔️ Adventure Trip", "text": "Plan an adventure trip to Manali for 5 days"},
        {"label": "🏛️ Cultural Tour", "text": "Best cultural destinations in India for 2 people"},
        {"label": "🌤️ Check Weather", "text": "What is the weather like in Goa right now?"},
        {"label": "🚆 How to Reach Goa", "text": "What are the transport options to reach Goa from Mumbai?"},
        {"label": "🏨 Hotels in Bali", "text": "Recommend mid-range hotels in Bali for a couple for 6 nights"},
        {"label": "🗺️ Bali Itinerary", "text": "Create a 7-day itinerary for Bali for a couple"},
        {"label": "📋 Book a Trip", "text": "Book a trip to Rajasthan for 2 people"},
    ]
    return jsonify({"prompts": prompts})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    print(f"\n🌍 Travel Planner Agent running at http://localhost:{port}")
    print(f"🤖 IBM Granite configured: {_agent.llm.is_configured()}")
    print(f"📋 Model: {os.getenv('GRANITE_MODEL_ID', 'ibm/granite-13b-chat-v2')}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
