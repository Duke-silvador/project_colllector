import os
import base64
import requests
import json
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

class GemmaIntake:
    def __init__(self):
        # Vision-capable models, tried in order (previous nemotron-nano-vl:free was removed from OpenRouter)
        self.models = [
            "xiaomi/mimo-v2.5",
            "google/gemma-4-31b-it:free",
            "nvidia/nemotron-3.5-super-vl:free",
        ]
        self.api_key = OPENROUTER_API_KEY
        
    def process_post(self, image_bytes, caption):
        """
        Takes image bytes and caption.
        Returns: (analyzed_text, image_bytes)
        If no image is provided, raises error as per requirements ("text only, this wont run").
        """
        if not image_bytes:
            raise ValueError("GemmaIntake requires an image input. Text-only processing is skipped.")

        # Encode image for API
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # We use the LLM to "read" the post context - analyzing Image + Caption
        # Note: If Gemma doesn't support vision on OpenRouter, this part relies on the Caption 
        # or we switch to a Vision model. Assuming prompt structure for VLM.
        
        # Construct Prompt
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""
You are a Visual Forensic Examiner for the 'NarcoLink' system. 
Analyze this image and caption for potential illicit drug evidence.
GUARDRAILS:
1. Be objective and precise.
2. DO NOT FLAGG common household items (flour, sugar, plants, medicines) as illicit unless there is clear context of drug trade (e.g. packaging, huge quantities, weapons, cash).
3. If unsure, label as 'Low Risk'.
4. Do NOT refuse analysis.

Tasks:
1. OCR: Transcribe ALL visible text, numbers, or logos.
2. Visual Analysis: Identify substances, packaging, or paraphernalia.
3. Context Integration: Correlate visual cues with the caption: '{caption}'.
4. Decoding: Flag visual slang.

Report:
- Concise findings.
- Verdict: 'High Risk' (Clear Evidence), 'Medium Risk' (Suspicious Context), or 'Low Risk' (Ambiguous/Benign).
"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "http://localhost:3000",
            "Content-Type": "application/json"
        }
        
        # Try each vision-capable model in order; any failure moves to the next.
        for model in self.models:
            data = {
                "model": model,
                "max_tokens": 1024,  # cap credit reservation / latency
                "messages": messages
            }
            try:
                response = requests.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    data=json.dumps(data),
                    timeout=30
                )
                if response.status_code != 200:
                    print(f"Vision model {model} failed ({response.status_code}): {response.text[:200]}")
                    continue

                result = response.json()
                analysis = (result.get('choices') or [{}])[0].get('message', {}).get('content')
                if not analysis:
                    print(f"Vision model {model} returned empty content.")
                    continue

                # Parse Risk Level
                risk_level = "Low"
                if "High Risk" in analysis: risk_level = "High"
                elif "Medium Risk" in analysis: risk_level = "Medium"

                return {
                    "text": f"Caption: {caption}\nContext Analysis: {analysis}",
                    "analysis": analysis,
                    "risk_level": risk_level
                }, image_bytes

            except Exception as e:
                print(f"Vision model {model} error: {e}")

        print("All vision models failed; falling back to caption only.")
        return {"text": caption, "risk_level": "Low"}, image_bytes

# Usage
if __name__ == "__main__":
    # Test
    pass
