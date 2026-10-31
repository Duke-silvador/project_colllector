import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import hashlib
import json
import os
import re

# --- 1. The Bloom Filter (Text Gate) ---
class DrugBloomFilter:
    """
    Standard Bloom Filter to pre-screen text before neural processing.
    """
    def __init__(self, items=None, capacity=1000, error_rate=0.01):
        self.capacity = capacity
        self.num_bits = int(- (capacity * math.log(error_rate)) / (math.log(2) ** 2))
        self.num_hashes = int((self.num_bits / capacity) * math.log(2))
        self.bit_array = [0] * self.num_bits
        
        if items:
            for item in items:
                self.add(item)

    def _hashes(self, item):
        digest = hashlib.sha256(item.encode('utf-8')).hexdigest()
        h1 = int(digest[0:16], 16)
        h2 = int(digest[16:32], 16)
        for i in range(self.num_hashes):
            yield (h1 + i * h2) % self.num_bits

    def add(self, item):
        for h in self._hashes(item.lower()):
            self.bit_array[h] = 1

    def check(self, item):
        for h in self._hashes(item.lower()):
            if self.bit_array[h] == 0:
                return False
        return True

# --- 2. The Fusion Neural Network ---
class MultimodalFusionNet(nn.Module):
    """
    Accepts pre-computed embeddings from ResNet50 and SLM, 
    fuses them, and outputs a single probability.
    """
    def __init__(self, text_dim=768, image_dim=2048, hidden_dim=512):
        super(MultimodalFusionNet, self).__init__()
        
        # Fusion Layer: Concatenate Text + Image
        self.fc1 = nn.Linear(text_dim + image_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)
        
        # Classification Head
        self.fc2 = nn.Linear(hidden_dim, 1) # Output 1 logit
        
    def forward(self, text_emb, img_emb):
        # Concatenate along the last dimension (batch_size, text_dim + img_dim)
        combined = torch.cat((text_emb, img_emb), dim=1)
        
        x = self.fc1(combined)
        x = self.relu(x)
        x = self.dropout(x)
        
        logit = self.fc2(x)
        return logit

# --- 3. The Inference Engine ---
class DrugDetectionEngine:
    def __init__(self, drug_json="Drug_Slang_Data/drugNames.json", fusion_weights=None, text_dim=384):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"🚀 Initializing Inference Engine on {self.device}...")

        # A. Load Dictionary & Bloom Filter
        self.slang_map = self._load_map(drug_json)
        self.bloom = DrugBloomFilter(items=self.slang_map.keys(), capacity=len(self.slang_map)*2)
        print("✓ Bloom Filter Populated")

        # B. Initialize Fusion Network & Encoder
        # Adjust dimensions if your SLM or ResNet output sizes differ
        self.model = MultimodalFusionNet(text_dim=text_dim, image_dim=2048).to(self.device)
        self.model.eval()

        # Load Encoder for Dynamic Comparisons
        try:
            from sentence_transformers import SentenceTransformer
            model_path = r"D:\Hackathon\CDTI_Shield\model\all-MiniLM-L6-v2"
            self.encoder = SentenceTransformer(model_path, device=self.device)
            print("✓ Local Encoder Loaded for Dynamic Scoring")
        except Exception as e:
            print(f"⚠️ Encoder load failed: {e}. Vector similarity disabled.")
            
        # Load weights if available
        if fusion_weights and os.path.exists(fusion_weights):
            self.model.load_state_dict(torch.load(fusion_weights))
            print("✓ Fusion Weights Loaded")
        else:
            # predict() scores with VLM risk + Bloom Filter + vector similarity; the fusion net is not used.
            print("ℹ️ Fusion net not used for scoring (rule-based: VLM risk + Bloom Filter + vector similarity).")

    def _load_map(self, path):
        """Robust loader that handles hidden characters in JSON"""
        # 1. Handle Path Resolution
        if not os.path.exists(path):
            # Try looking in the same directory as the script
            path = os.path.join(os.path.dirname(__file__), path)
            
        if not os.path.exists(path):
            print(f"❌ Error: Could not find {path}")
            return {}

        # 2. Open with UTF-8 and Sanitize
        try:
            with open(path, 'r', encoding='utf-8') as f:
                raw_content = f.read()
                
                # FIX: Remove standard invalid control characters
                # JSON does not allow real line breaks inside strings
                clean_content = raw_content.replace('\n', ' ').replace('\r', '').replace('\t', ' ')
                
                data = json.loads(clean_content)
                
            mapping = {}
            for drug, slangs in data.items():
                for s in slangs:
                    mapping[s.lower()] = drug
            return mapping
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON Error in {path}: {e}")
            print("Tip: Check your JSON file for unescaped characters.")
            return {}
        except Exception as e:
            print(f"❌ Unexpected error loading map: {e}")
            return {}

    def predict(self, raw_text, text_embedding, image_embedding, risk_level="Low"):
        """
        Main Inference Function.
        Args:
            raw_text (str): The sentence.
            text_embedding: 1x768 tensor.
            image_embedding: 1x2048 tensor.
            risk_level (str): "High", "Medium", "Low" from VLM.
        """
        response = {
            "decision": "Negative",
            "confidence": 0.0,
            "stage": "Input",
            "retrieval_data": {}
        }

        # Ensure inputs are tensors on device
        if not isinstance(text_embedding, torch.Tensor):
            text_embedding = torch.tensor(text_embedding)
        if not isinstance(image_embedding, torch.Tensor):
            image_embedding = torch.tensor(image_embedding)

        t_emb = text_embedding.to(self.device).float()
        
        # Reshape if necessary (ensure batch dim is 1)
        if t_emb.dim() == 1: t_emb = t_emb.unsqueeze(0)

        # --- STAGE 0: VLM RISK OVERRIDE ---
        # If VLM explicitly flagged High Risk, we bypass strict Bloom Filter checks.
        vlm_override = False
        base_score = 0.1
        
        if risk_level == "High":
            base_score = 0.85 # Start very high
            vlm_override = True
        elif risk_level == "Medium":
            base_score = 0.55 # Start suspicious
            vlm_override = True

        # --- STAGE 1: BLOOM FILTER (Fast Fail) ---
        text_lower = raw_text.lower()
        candidates = []
        
        # Check tokens against Bloom Filter
        tokens = re.findall(r'\b\w+\b', text_lower)
        possible_hit = False
        
        for token in tokens:
            if self.bloom.check(token):
                if token in self.slang_map:
                    candidates.append(token)
                    possible_hit = True

        # IF No Keywords AND No Visual Risk -> Safe to Reject
        if not possible_hit and not vlm_override:
            response["decision"] = "Negative"
            response["confidence"] = 0.0
            response["stage"] = "Bloom Filter"
            response["retrieval_data"] = {"reason": "No slang terms found and Visual Risk is Low."}
            return response
            
        # If we have keywords, base score bumps up (if not already high from VLM)
        if possible_hit:
            base_score = max(base_score, 0.6)

        # --- STAGE 2: DYNAMIC SCORING (Vector Similarity) ---
        sim_boost = 0.0
        max_sim = 0.0
        
        # Vector Similarity Check (Only if we have candidates to check against)
        if candidates and hasattr(self, 'encoder'):
            drug_names = [self.slang_map[c] for c in candidates]
            unique_drugs = list(set(drug_names))
            
            target_vectors = self.encoder.encode(unique_drugs, convert_to_tensor=True).to(self.device).float()
            
            t_emb_norm = F.normalize(t_emb, p=2, dim=1)
            target_norm = F.normalize(target_vectors, p=2, dim=1)
            
            similarities = torch.mm(t_emb_norm, target_norm.t())
            max_sim = similarities.max().item()
            
            # Revised Thresholds for Balance
            if max_sim > 0.4:
                sim_boost = max_sim * 0.4
            elif max_sim < 0.2:
                sim_boost = -0.1
                
            response["retrieval_data"]["max_vector_similarity"] = round(max_sim, 4)
            
        probability = base_score + sim_boost
        probability = max(0.0, min(0.99, probability)) # Clamp
        
        # --- STAGE 3: DECISION ---
        # Adjusted threshold
        threshold = 0.60
        
        drug_names = [self.slang_map[c] for c in candidates] if candidates else []
        unique_drugs = list(set(drug_names))
        
        response["decision"] = "Positive" if probability > threshold else "Negative"
        response["confidence"] = round(probability, 4)
        response["stage"] = "Vector Interaction" if candidates else "Visual Risk Assessment"
        
        response["retrieval_data"].update({
            "detected_slang_candidates": candidates,
            "potential_drugs": unique_drugs,
            "visual_risk_level": risk_level,
            "fusion_logic": "VLM Risk + Bloom Filter + Vector Sim",
            "explanation": (
                f"Visual Risk: {risk_level} (Base: {base_score}). "
                f"Found {len(candidates)} terms. "
                f"Vector sim boost: {sim_boost:.2f}."
            )
        })

        return response

# --- 4. Simulation / Usage ---
if __name__ == "__main__":
    # Create the engine
    engine = DrugDetectionEngine()

    print("\n--- 🧪 Simulating Inputs (Embeddings already generated) ---")

    # MOCK DATA: Simulating what your previous scripts produced
    # Case 1: "I need some snow" (Text: Suspicious) + Image of White Powder (Suspicious)
    mock_text_emb = torch.randn(1, 768)   # Random vector simulating BERT
    mock_img_emb = torch.randn(1, 2048)   # Random vector simulating ResNet
    raw_sentence_1 = "I need some snow for the party"

    # Case 2: "The weather is nice" (Text: Innocent) + Image of a Dog
    raw_sentence_2 = "The weather is nice today"

    # --- Run Prediction 1 ---
    print(f"\n🔍 Analyzing: '{raw_sentence_1}'")
    result1 = engine.predict(raw_sentence_1, mock_text_emb, mock_img_emb)
    print(json.dumps(result1, indent=2))

    # --- Run Prediction 2 ---
    print(f"\n🔍 Analyzing: '{raw_sentence_2}'")
    result2 = engine.predict(raw_sentence_2, mock_text_emb, mock_img_emb)
    print(json.dumps(result2, indent=2))