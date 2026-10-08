from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import json

app = FastAPI(title="TextAnalyzer MVP")

class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to analyze")
    language: str = Field(default="en", description="Language code")

class TextResponse(BaseModel):
    word_count: int
    char_count: int
    language: str
    sentiment: str

def analyze_text(text: str, language: str) -> dict:
    words = text.split()
    return {
        "word_count": len(words),
        "char_count": len(text),
        "language": language,
        "sentiment": "neutral" if not text else "positive" if len(words) > 5 else "negative"
    }

@app.post("/analyze", response_model=TextResponse)
def analyze(request: TextRequest):
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=422, detail="Text cannot be empty or whitespace only")
    result = analyze_text(request.text, request.language)
    return result

def demo():
    from fastapi.testclient import TestClient
    client = TestClient(app)
    res = client.post("/analyze", json={"text": "Hello World", "language": "en"})
    print(f"Status: {res.status_code}")
    print(f"Body: {json.dumps(res.json(), indent=2)}")
