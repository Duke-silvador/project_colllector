import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import json
import io
import os
import uuid

# Import Modules
from gemma_intake import GemmaIntake
from image_embed import ImageEmbedder
from decoder import DrugDecoder
from bloom_filter import DrugDetectionEngine


app = FastAPI(title="Social Media Drug Detection API")

# CORS (Allow Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "*"], # Explicitly allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Singletons ---
print("--- Loading AI Models ---")
gemma_intake = GemmaIntake()
image_embedder = ImageEmbedder()
drug_decoder = DrugDecoder()
# stt_engine = SpeechToText() # Dropped
engine = DrugDetectionEngine(text_dim=384) # Match decoder output
print("--- Models Loaded ---")

# Forensic Logging
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_upload(file: UploadFile):
    """Saves uploaded file to disk and returns path."""
    if not file or not file.filename:
        return None
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as buffer:
        buffer.write(file.file.read())
    file.file.seek(0) # Reset cursor for other reads if needed
    return path

@app.post("/analyze")
async def analyze_post(
    caption: str = Form(None),
    image: UploadFile = File(None),
    document: UploadFile = File(None) # Check for text file
):
    try:
        # Forensic Saving
        image_path = save_upload(image)
        doc_path = save_upload(document)
        # audio_path dropped
        
        print(f"Request: Cap={bool(caption)}, Img={bool(image_path)}, Doc={bool(doc_path)}")

        # Check if image is effectively empty
        image_bytes = None
        if image and image.filename:
            content = await image.read()
            if len(content) > 0:
                image_bytes = content
        
        # 0. INPUT PROCESSING
        # A. Audio Dropped
        transcription = "" 
                
        # B. Document Text Processing
        if doc_path and doc_path.endswith(".txt"):
             print("📄 Reading Text File...")
             with open(doc_path, "r", encoding="utf-8", errors="ignore") as f:
                 doc_content = f.read()
             if caption:
                caption = f"{caption}\n{doc_content}"
             else:
                caption = doc_content

        # Validate Inputs
        if not caption and not image_bytes:
             raise HTTPException(status_code=400, detail="Must provide either text, image, or document.")
            
        # Defaults
        analyzed_text = caption or ""
        text_vec = torch.zeros(384)
        img_vec = torch.zeros(2048)
        
        # 1. PROCESS IMAGE (If Present)
        if image_bytes:
            # B. Get Image Vector
            img_vec = image_embedder.get_embedding(image_bytes)
            
        # Default Risk
        risk_level = "Low"
        
        # CASE A: Multimodal (Both) OR Image Only
        if image_bytes:
             # Use Gemma to get context (from image + optional caption)
             # formatted_text is dict now: {'text':..., 'risk_level':...}
             gemma_result, _ = gemma_intake.process_post(image_bytes, caption or "")
             
             analyzed_text = gemma_result.get("text", "")
             risk_level = gemma_result.get("risk_level", "Low")
             
             # Decode the resulting text context
             text_vec = drug_decoder.decode_and_embed(analyzed_text)
             
        # CASE B: Text Only
        elif caption and not image_bytes:
            # Skip Gemma (Text Only Mode as per instructions)
            # Directly decode the caption
            analyzed_text = caption
            text_vec = drug_decoder.decode_and_embed(caption)
            
            # REFINED: Analyze Risk via Mimo (Text LLM)
            # This ensures "Genuine Threats" in text trigger the override even without images
            risk_level = drug_decoder.assess_risk(caption)

        # 4. Fusion & Prediction
        # Engine handles zero vectors if trained robustly, otherwise it might skew results.
        # Assuming FusionNet can handle zeroed modalities (e.g. if dropout was used during training)
        result = engine.predict(analyzed_text, text_vec, img_vec, risk_level=risk_level)
        
        # 5. Format Response
        mode = "Text Only"
        if image_bytes and caption: mode = "Multimodal"
        elif image_bytes: mode = "Image Only"

        return {
            "status": "success",
            "analysis": result,
            "meta": {
                "original_caption": caption,
                "transcription": "", # Empty
                "gemma_context": analyzed_text,
                "visual_risk": risk_level,
                "mode": mode
            }
        }



    except Exception as e:
        print(f"Processing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- EXTRACTOR MODULE (Zoro Integration) ---
import zoro

@app.post("/extractor")
async def run_extractor(
    query: str = Form(...)
):
    print(f" Extractor Request: {query}")
    try:
        # Check Tor
        proxies = zoro.get_tor_proxies()
        port = int(proxies['http'].split(':')[-1])
        if not zoro.check_port(port):
            return {
                "status": "error",
                "report": f" WARNING: Tor Proxy (Port {port}) is NOT reachable. Please ensure Tor Browser is running."
            }

        # Initialize Agent
        try:
            llm = zoro.get_llm()
            agent = zoro.DarkWebAgent(llm, max_depth=2, max_iterations=1) # Reduced depth for Web UI responsiveness
        except Exception as e:
            return {"status": "error", "report": f"Agent Init Failed: {e}"}

        # Run Agent
        # Note: This is a long-running process (crawling). 
        # Ideally, we should use WebSockets or BackgroundTasks.
        # But for MVP, we block. Front-end shows spinner.
        
        final_data = agent.run(query)
        
        if not final_data:
             return {
                 "status": "success",
                 "report": "## Mission Failed\nNo actionable intelligence found. Try a different query."
             }
             
        report = zoro.generate_summary(llm, query, final_data)
        
        return {
            "status": "success", 
            "report": report
        }
        
    except Exception as e:
        print(f"Extractor Error: {e}")
        return {"status": "error", "report": f"Internal Error: {e}"}



if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
