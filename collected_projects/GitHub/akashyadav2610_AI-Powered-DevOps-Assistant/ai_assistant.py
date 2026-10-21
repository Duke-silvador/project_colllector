import os
from dotenv import load_dotenv
from google import genai

# Load environment variables from .env
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Gemini client
client = genai.Client(api_key=API_KEY) if API_KEY else None


def ask_gemini(task):
    """Generate a response for a DevOps-related question."""

    if not client:
        return "Error: GEMINI_API_KEY was not found in your .env file."

    prompt = f"""
    You are an AI-powered DevOps assistant.

    Help the user with Linux commands, Git, Docker, CI/CD,
    and troubleshooting build or deployment errors.

    User request: {task}

    Requirements:
    1. Give a relevant solution.
    2. Explain the solution in simple language.
    3. Warn the user about potentially destructive commands.
    4. Never claim that a command has been executed.
    5. Ask for clarification if important details are missing.
    """

    try:
        response = client.models.generate_content(
    model="gemini-3.8-flash",
    contents=prompt
)

        if response.text:
            return response.text

        return "Gemini returned an empty response. Please try again."

    except Exception as error:
        return f"Gemini API error: {error}"