import os
import torch
import torch.nn.functional as F
import requests
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

class DrugDecoder:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Initializing DrugDecoder (AllMiniLM-L6-v2) on {self.device}...")
        
        # 1. Load Vector Model (Local)
        model_path = r"D:\Hackathon\CDTI_Shield\model\all-MiniLM-L6-v2"
        try:
            self.vector_model = SentenceTransformer(model_path, device=self.device)
            print(f"✓ Loaded local AllMiniLM from {model_path}")
        except Exception as e:
            print(f" Local AllMiniLM load failed: {e}. Trying HuggingFace hub as fallback...")
            self.vector_model = SentenceTransformer('all-MiniLM-L6-v2', device=self.device)
        self.vector_dim = 384 # MiniLM is 384. If Fusion expects 768, we might need concatenation.
        
        # 2. LLM Config (Mimo via OpenRouter)
        self.llm_model = "xiaomi/mimo-v2.5"
        self.api_key = OPENROUTER_API_KEY
    
    def extract_candidates(self, text):
        """Use Mimo to find potential slang words."""
        prompt = f"""
        Identify potential drug slang words in this text. 
        Return ONLY a JSON list of strings. If none, return [].
        Text: "{text}"
        """
        try:
            response = requests.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                data=json.dumps({
                    "model": self.llm_model,
                    "max_tokens": 1024,
                "messages": [
                        {"role": "system", "content": "You are an expert Narcotics Intelligence Analyst. Your task is to identify and extract potential coded drug slang from text based on forensic linguistics. Return ONLY a JSON list of strings. Do not explain."},
                        {"role": "user", "content": f"Extract drug slang from: '{text}'. Return JSON list (e.g. [\"word\"]). If none, return []."}
                    ]
                }),
                timeout=10
            )
            content = response.json()['choices'][0]['message']['content']
            # specific parsing logic
            if "[" in content and "]" in content:
                start = content.find("[")
                end = content.find("]") + 1
                return json.loads(content[start:end])
            return []
        except Exception as e:
            print(f"Mimo Extraction Error: {e}")
            return []

    def assess_risk(self, text):
        """
        Use Mimo to assess the Risk Level (High/Medium/Low) of the text context.
        """
        try:
            response = requests.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                data=json.dumps({
                    "model": self.llm_model,
                    "max_tokens": 1024,
                    "messages": [
                        {"role": "system", "content": "You are a Content Safety Analyst. Assess if the text contains explicit or implied Intent to Buy/Sell/Use Illegal Drugs. Output ONLY: 'High', 'Medium', or 'Low'."},
                        {"role": "user", "content": f"Text: '{text}'\nRisk Level:"}
                    ]
                }),
                timeout=10
            )
            content = response.json()['choices'][0]['message']['content']
            if "High" in content: return "High"
            if "Medium" in content: return "Medium"
            return "Low"
            
        except Exception as e:
            print(f"Mimo Risk Assessment Error: {e}")
            return "Low"

    def vector_alchemy(self, word):
        """
        Apply: V_final = V_word - V_innocent_context + V_criminal_intent
        """
        # Get base embedding
        v_word = self.vector_model.encode(word, convert_to_tensor=True)
        
        # Define context vectors (Conceptually)
        # In a real trained system, these are learned weights. 
        # Here we use the model to embed the concepts directly.
        v_innocent = self.vector_model.encode("innocent standard usage", convert_to_tensor=True)
        v_criminal = self.vector_model.encode("illegal drug trade context", convert_to_tensor=True)
        
        # Apply Formula
        v_final = v_word - v_innocent + v_criminal
        
        return F.normalize(v_final, p=2, dim=0)

    def decode_and_embed(self, text):
        """
        Full Pipeline:
        1. Extract Slang.
        2. Apply Vector Alchemy to slang.
        3. Combine into final text vector (e.g. average of alchemy vectors + sentence vector).
        """
        candidates = self.extract_candidates(text)
        
        base_sent_vec = self.vector_model.encode(text, convert_to_tensor=True)
        
        vectors = [base_sent_vec]
        
        for cand in candidates:
            # Apply alchemy to candidate
            alchemy_vec = self.vector_alchemy(cand)
            vectors.append(alchemy_vec)
            
        # Average all vectors to get final representation
        if len(vectors) > 1:
            final_vec = torch.stack(vectors).mean(dim=0)
        else:
            final_vec = base_sent_vec
            
        return final_vec.cpu() # Return as CPU tensor

if __name__ == "__main__":
    decoder = DrugDecoder()
    vec = decoder.decode_and_embed("I need some snow")
    print(f"Vector Shape: {vec.shape}")
