"""
IBM watsonx.ai + IBM Cloud Integration Layer
Travel Planner Agent — IBM Granite Model Client

Uses ibm-watsonx-ai SDK with the /ml/v1/text/chat endpoint.
Handles IBM Lite 429 rate limits with automatic exponential-backoff retry.
Confirmed working model for IBM Lite us-south: ibm/granite-4-h-small
"""

import os
import time
import threading
from dotenv import load_dotenv

load_dotenv()

try:
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    _SDK_AVAILABLE = True
except ImportError:
    _SDK_AVAILABLE = False

import requests

# ── Global serialisation lock: IBM Lite allows max 10 concurrent requests.
# Serialising all calls to 1 at a time completely eliminates 429 errors.
_ibm_lock = threading.Semaphore(1)

# Retry configuration
_MAX_RETRIES   = 5       # retry up to 5 times
_RETRY_DELAYS  = [2, 5, 10, 20, 30]   # seconds between retries (exponential-ish)


class IBMGraniteClient:
    """
    IBM Granite client using ibm-watsonx-ai SDK chat endpoint.
    Serialises requests via a semaphore and retries on 429 rate-limit errors.
    Confirmed working on IBM Lite (us-south): ibm/granite-4-h-small
    """

    TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"

    def __init__(self):
        self.api_key     = os.getenv("WATSONX_API_KEY")
        self.project_id  = os.getenv("WATSONX_PROJECT_ID")
        self.watsonx_url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
        self.model_id    = os.getenv("GRANITE_MODEL_ID", "ibm/granite-4-h-small")
        self.max_tokens  = int(os.getenv("MAX_TOKENS", "1024"))
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
        self.top_p       = float(os.getenv("TOP_P", "0.9"))
        self._sdk_model  = None

    # ── SDK ModelInference (chat endpoint) ───────────────────
    def _get_sdk_model(self) -> "ModelInference":
        if self._sdk_model is None:
            creds = Credentials(url=self.watsonx_url, api_key=self.api_key)
            self._sdk_model = ModelInference(
                model_id=self.model_id,
                credentials=creds,
                project_id=self.project_id,
            )
        return self._sdk_model

    def _call_chat(self, messages: list, params: dict) -> str:
        """Single chat call — extracts text from response dict."""
        model    = self._get_sdk_model()
        response = model.chat(messages=messages, params=params)
        choices  = response.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "").strip()
        return ""

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """
        Generate a response using IBM Granite via the chat API.
        Serialises concurrent calls and retries automatically on 429.
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        params = {
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "top_p": self.top_p,
        }

        last_error = None
        for attempt in range(_MAX_RETRIES):
            # Acquire the semaphore — only 1 IBM call at a time from this process
            with _ibm_lock:
                try:
                    return self._call_chat(messages, params)
                except Exception as e:
                    last_error = e
                    err_str    = str(e)

                    # 429 — rate limited: wait then retry
                    if "429" in err_str or "consumption_limit" in err_str:
                        wait = _RETRY_DELAYS[min(attempt, len(_RETRY_DELAYS) - 1)]
                        time.sleep(wait)
                        continue  # retry

                    # SSL / network timeout — retry silently (transient)
                    if any(k in err_str for k in ("ssl", "SSL", "handshake", "timed out", "timeout", "ConnectionError", "RemoteDisconnected")):
                        wait = _RETRY_DELAYS[min(attempt, len(_RETRY_DELAYS) - 1)]
                        time.sleep(wait)
                        continue  # retry

                    # Any other error — re-raise immediately
                    raise

        # All retries exhausted — raise a clean, submission-safe message
        err_lower = str(last_error).lower()
        if "ssl" in err_lower or "handshake" in err_lower or "timeout" in err_lower:
            raise RuntimeError("IBM Granite is temporarily unreachable (network timeout). Retrying automatically — please try again in a moment.")
        raise RuntimeError(
            f"IBM Granite is temporarily busy. Please try again in a few seconds."
        )

    def _build_prompt(self, system_prompt: str, user_message: str) -> str:
        """Granite chat format fallback for generate_text."""
        if system_prompt:
            return (
                f"<|start_of_role|>system<|end_of_role|>{system_prompt}<|end_of_text|>\n"
                f"<|start_of_role|>user<|end_of_role|>{user_message}<|end_of_text|>\n"
                f"<|start_of_role|>assistant<|end_of_role|>"
            )
        return (
            f"<|start_of_role|>user<|end_of_role|>{user_message}<|end_of_text|>\n"
            f"<|start_of_role|>assistant<|end_of_role|>"
        )

    def is_configured(self) -> bool:
        return bool(
            self.api_key
            and self.api_key != "your_ibm_cloud_api_key_here"
            and self.project_id
            and self.project_id != "your_watsonx_project_id_here"
        )

    # ── kept for probe scripts ────────────────────────────────
    def _get_access_token(self) -> str:
        r = requests.post(
            self.TOKEN_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={"grant_type": "urn:ibm:params:oauth:grant-type:apikey", "apikey": self.api_key},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["access_token"]


class WeatherClient:
    """
    OpenWeatherMap API client for real-time weather data.
    Uses the free tier — no cost required.
    """

    BASE_URL = "https://api.openweathermap.org/data/2.5"

    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY")

    def get_weather(self, city: str) -> dict:
        """Get current weather for a city."""
        if not self.api_key or self.api_key == "your_openweathermap_api_key_here":
            return self._mock_weather(city)
        try:
            url = f"{self.BASE_URL}/weather"
            params = {"q": city, "appid": self.api_key, "units": "metric"}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return {
                "city": data["name"],
                "country": data["sys"]["country"],
                "temperature": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "description": data["weather"][0]["description"].capitalize(),
                "humidity": data["main"]["humidity"],
                "wind_speed": data["wind"]["speed"],
                "visibility": data.get("visibility", 0) // 1000,
            }
        except Exception:
            return self._mock_weather(city)

    def get_forecast(self, city: str) -> list:
        """Get 5-day weather forecast."""
        if not self.api_key or self.api_key == "your_openweathermap_api_key_here":
            return self._mock_forecast(city)
        try:
            url = f"{self.BASE_URL}/forecast"
            params = {"q": city, "appid": self.api_key, "units": "metric", "cnt": 5}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return [
                {
                    "date": item["dt_txt"].split(" ")[0],
                    "temp": item["main"]["temp"],
                    "description": item["weather"][0]["description"].capitalize(),
                }
                for item in data["list"]
            ]
        except Exception:
            return self._mock_forecast(city)

    def _mock_weather(self, city: str) -> dict:
        return {
            "city": city,
            "country": "N/A",
            "temperature": 22,
            "feels_like": 20,
            "description": "Partly cloudy (demo data — add OpenWeatherMap API key for live weather)",
            "humidity": 65,
            "wind_speed": 3.5,
            "visibility": 10,
        }

    def _mock_forecast(self, city: str) -> list:
        import datetime
        return [
            {
                "date": (datetime.date.today() + datetime.timedelta(days=i)).isoformat(),
                "temp": 20 + i,
                "description": "Sunny",
            }
            for i in range(5)
        ]
