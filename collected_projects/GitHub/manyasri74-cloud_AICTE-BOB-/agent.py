"""
Travel Planner Agent
Core agent powered by IBM Granite via watsonx.ai.
Orchestrates all travel tools to provide intelligent, personalized travel planning.
"""

import re
import json
from typing import Optional
from ibm_client import IBMGraniteClient
from tools.destinations import DestinationTool
from tools.itinerary import ItineraryTool
from tools.weather import WeatherTool
from tools.transport import TransportTool
from tools.accommodation import AccommodationTool
from tools.bookings import BookingTool


SYSTEM_PROMPT = """You are TravelBot, an intelligent and friendly AI Travel Planner powered by IBM Granite.

Your capabilities:
- Suggest personalized travel destinations based on interests, budget, and season
- Build detailed day-by-day itineraries
- Provide real-time weather information and packing tips
- Recommend transport options (flights, trains, buses, local travel)
- Suggest accommodation options (budget to luxury)
- Manage travel bookings and alerts
- Optimize travel schedules on-the-fly

Guidelines:
- Always be warm, enthusiastic, and professional
- Ask clarifying questions when needed (destination, budget, duration, traveller count)
- Provide specific, actionable recommendations with prices and booking links
- Highlight must-see attractions and hidden gems
- Always consider safety, visa requirements, and best seasons
- Keep responses concise but comprehensive

When a user asks about:
- Destinations → suggest 3–5 options with brief descriptions
- Itinerary → build a day-by-day plan
- Weather → give current conditions and packing tips
- Transport → compare options with pros/cons and booking platforms
- Hotels → list options by budget with amenities
- Booking → confirm the trip and provide a booking ID

Always end your response with a helpful follow-up question to keep the planning moving forward."""


def _extract_intent(message: str) -> dict:
    """
    Parse the user message to detect intent and extract key parameters.
    Returns a dict with intent and extracted entities.
    """
    msg = message.lower()

    intent = {
        "type": "general",
        "destination": None,
        "budget": None,
        "duration": None,
        "interest": None,
        "travellers": 1,
        "origin": None,
    }

    # Detect intent type
    if any(w in msg for w in ["destination", "where should", "where to go", "suggest", "recommend place", "places to visit"]):
        intent["type"] = "destination"
    elif any(w in msg for w in ["itinerary", "plan my trip", "day by day", "schedule", "what to do in", "activities in"]):
        intent["type"] = "itinerary"
    elif any(w in msg for w in ["weather", "temperature", "climate", "rain", "forecast", "what to pack", "packing"]):
        intent["type"] = "weather"
    elif any(w in msg for w in ["transport", "flight", "train", "bus", "how to reach", "travel from", "get to"]):
        intent["type"] = "transport"
    elif any(w in msg for w in ["hotel", "stay", "accommodation", "hostel", "resort", "airbnb", "where to stay"]):
        intent["type"] = "accommodation"
    elif any(w in msg for w in ["book", "booking", "confirm", "reserve", "plan is ready"]):
        intent["type"] = "booking"

    # Extract budget
    if any(w in msg for w in ["cheap", "budget", "affordable", "backpack", "low cost"]):
        intent["budget"] = "low"
    elif any(w in msg for w in ["luxury", "premium", "5 star", "five star", "high end"]):
        intent["budget"] = "high"
    elif any(w in msg for w in ["mid range", "moderate", "medium", "comfortable"]):
        intent["budget"] = "medium"

    # Extract duration
    duration_match = re.search(r"(\d+)\s*day", msg)
    if duration_match:
        intent["duration"] = int(duration_match.group(1))

    # Extract traveller count
    traveller_match = re.search(r"(\d+)\s*(person|people|travell|adult|pax)", msg)
    if traveller_match:
        intent["travellers"] = int(traveller_match.group(1))

    # Extract interest/type
    for interest in ["beach", "cultural", "adventure", "city", "nature", "heritage", "hill", "mountain"]:
        if interest in msg:
            intent["interest"] = interest
            break

    # Try to extract destination names (simple heuristic)
    known_places = [
        "goa", "bali", "maldives", "phuket", "kyoto", "rome", "rajasthan", "istanbul",
        "manali", "queenstown", "nepal", "singapore", "dubai", "bangkok", "coorg",
        "paris", "london", "new york", "tokyo", "sydney", "mumbai", "delhi",
        "shimla", "darjeeling", "kerala", "andaman", "leh ladakh",
    ]
    for place in known_places:
        if place in msg:
            intent["destination"] = place.title()
            break

    return intent


class TravelPlannerAgent:
    """
    IBM Granite-powered Travel Planner Agent.
    Orchestrates tools and uses LLM for natural language understanding.
    """

    def __init__(self):
        self.llm = IBMGraniteClient()
        self.destination_tool = DestinationTool()
        self.itinerary_tool = ItineraryTool()
        self.weather_tool = WeatherTool()
        self.transport_tool = TransportTool()
        self.accommodation_tool = AccommodationTool()
        self.booking_tool = BookingTool()
        self._conversation_history = []

    def chat(self, user_message: str) -> str:
        """
        Process user message and return a comprehensive travel planning response.
        Uses IBM Granite for NLU + tool orchestration for structured data.
        """
        self._conversation_history.append({"role": "user", "content": user_message})

        # Extract intent and key entities
        intent = _extract_intent(user_message)

        # Gather tool output based on intent
        tool_context = self._run_tools(intent, user_message)

        # Build enhanced prompt for IBM Granite
        enhanced_prompt = self._build_enhanced_prompt(user_message, tool_context, intent)

        # Call IBM Granite
        if self.llm.is_configured():
            try:
                response = self.llm.generate(enhanced_prompt, SYSTEM_PROMPT)
            except Exception as e:
                # Fallback to tool-based response if Granite call fails
                response = self._fallback_response(tool_context, intent, str(e))
        else:
            # Demo mode — no IBM credentials configured yet
            response = self._demo_response(tool_context, intent, user_message)

        self._conversation_history.append({"role": "assistant", "content": response})
        return response

    def _run_tools(self, intent: dict, message: str) -> str:
        """Run relevant tools and return formatted context string."""
        parts = []

        if intent["type"] == "destination":
            results = self.destination_tool.suggest_destinations(
                interest=intent.get("interest"),
                budget=intent.get("budget", "any"),
                duration_days=intent.get("duration", 7),
            )
            parts.append(self.destination_tool.format_for_display(results))

        elif intent["type"] == "itinerary" and intent.get("destination"):
            dest_info = self.destination_tool.get_destination_info(intent["destination"])
            dest_type = dest_info["type"] if dest_info else "cultural"
            itinerary = self.itinerary_tool.build_itinerary(
                destination=intent["destination"],
                duration_days=intent.get("duration", 5),
                destination_type=dest_type,
            )
            parts.append(self.itinerary_tool.format_for_display(itinerary))

        elif intent["type"] == "weather" and intent.get("destination"):
            weather_info = self.weather_tool.get_weather_info(intent["destination"])
            parts.append(self.weather_tool.format_for_display(weather_info))

        elif intent["type"] == "transport" and intent.get("destination"):
            origin = intent.get("origin") or "your city"
            transport = self.transport_tool.recommend_transport(
                origin=origin,
                destination=intent["destination"],
                budget=intent.get("budget", "medium"),
            )
            parts.append(self.transport_tool.format_for_display(transport))

        elif intent["type"] == "accommodation" and intent.get("destination"):
            acc = self.accommodation_tool.recommend_accommodation(
                destination=intent["destination"],
                budget=intent.get("budget", "medium"),
                duration_nights=intent.get("duration", 5),
            )
            parts.append(self.accommodation_tool.format_for_display(acc))

        elif intent["type"] == "booking" and intent.get("destination"):
            booking = self.booking_tool.create_booking(
                destination=intent["destination"],
                start_date="2025-12-15",
                end_date="2025-12-22",
                travellers=intent.get("travellers", 1),
            )
            summary = self.booking_tool.get_trip_summary(booking["booking_id"])
            parts.append(self.booking_tool.format_booking_for_display(summary))

        return "\n\n".join(parts) if parts else ""

    def _build_enhanced_prompt(self, user_message: str, tool_context: str, intent: dict) -> str:
        """Build a rich prompt combining user query and tool output for Granite."""
        history_text = ""
        if len(self._conversation_history) > 2:
            recent = self._conversation_history[-4:-1]
            for msg in recent:
                history_text += f"{msg['role'].upper()}: {msg['content']}\n"

        if tool_context:
            return (
                f"{history_text}"
                f"USER: {user_message}\n\n"
                f"[Travel Data Retrieved]\n{tool_context}\n\n"
                f"Please use the above travel data to give the user a comprehensive, friendly, and actionable response."
            )
        return f"{history_text}USER: {user_message}"

    def _fallback_response(self, tool_context: str, intent: dict, error: str) -> str:
        """Return tool-based response when Granite is temporarily unavailable."""
        if tool_context:
            return tool_context
        return (
            "I'm here to help you plan your perfect trip! 🌍\n\n"
            "Please tell me:\n"
            "- **Where** do you want to go? (or should I suggest?)\n"
            "- **When** are you planning to travel?\n"
            "- **How many days** is your trip?\n"
            "- **What's your budget?** (budget/medium/luxury)\n"
            "- **What interests you?** (beach, cultural, adventure, nature, city)"
        )

    def _demo_response(self, tool_context: str, intent: dict, user_message: str) -> str:
        """
        Demo response when IBM credentials are not configured.
        Uses tool data + templated responses to simulate the agent.
        """
        if tool_context:
            intro = self._get_demo_intro(intent)
            outro = self._get_demo_outro(intent)
            return f"{intro}\n\n{tool_context}\n\n{outro}"

        # Generic welcome/help response
        return (
            "👋 **Welcome to TravelBot — Your AI Travel Planner!**\n\n"
            "I'm powered by **IBM Granite** (IBM watsonx.ai) and can help you:\n\n"
            "✈️ **Discover Destinations** — Tell me your interests and budget\n"
            "🗺️ **Build Itineraries** — Day-by-day travel plans\n"
            "🌤️ **Check Weather** — Real-time conditions & packing tips\n"
            "🚆 **Plan Transport** — Flights, trains, buses compared\n"
            "🏨 **Find Hotels** — From budget hostels to luxury resorts\n"
            "📋 **Manage Bookings** — Confirm and track your trips\n\n"
            "---\n"
            "To get started, just tell me:\n"
            "- *\"Suggest beach destinations under $50/day\"*\n"
            "- *\"Plan a 7-day trip to Goa\"*\n"
            "- *\"What's the weather in Bali?\"*\n"
            "- *\"Hotels in Rajasthan for a family\"*\n\n"
            "⚙️ *Add your IBM watsonx.ai credentials to `.env` to enable full AI responses.*"
        )

    def _get_demo_intro(self, intent: dict) -> str:
        intros = {
            "destination": "🌍 Great! Here are some destinations I'd recommend based on your preferences:",
            "itinerary": f"🗺️ Here's your personalized itinerary for {intent.get('destination', 'your chosen destination')}:",
            "weather": f"🌤️ Here's the weather information for {intent.get('destination', 'your destination')}:",
            "transport": f"🚆 Here are the best ways to reach {intent.get('destination', 'your destination')}:",
            "accommodation": f"🏨 Here are accommodation options in {intent.get('destination', 'your destination')}:",
            "booking": "✅ Let me confirm your booking details:",
        }
        return intros.get(intent["type"], "Here's what I found for you:")

    def _get_demo_outro(self, intent: dict) -> str:
        outros = {
            "destination": "Would you like me to build a detailed itinerary for any of these destinations? 🗺️",
            "itinerary": "Want me to check the weather forecast and suggest what to pack? 🌤️",
            "weather": "Would you like transport or hotel recommendations for this destination? 🏨",
            "transport": "Want me to suggest accommodation options at your destination? 🏨",
            "accommodation": "Ready to confirm your booking? Just say 'Book my trip to [destination]'! ✅",
            "booking": "Your trip is confirmed! Would you like to add any special requirements or alerts? 🔔",
        }
        return outros.get(intent["type"], "What else would you like to plan? 😊")

    def reset_conversation(self):
        """Clear conversation history."""
        self._conversation_history = []
