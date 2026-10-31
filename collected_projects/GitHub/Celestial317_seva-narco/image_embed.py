import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

class ImageEmbedder:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Initializing ResNet50 on {self.device}...")
        
        # Load ResNet50 Architecture (No Weights initially)
        self.model = models.resnet50(weights=None)
        
        # Load Local Weights
        weights_path = r"D:\Hackathon\CDTI_Shield\model\narcolink_resnet50.pth"
        try:
            state_dict = torch.load(weights_path, map_location=self.device)
            # Handle if the pth file keys are different (sometimes "model" or "state_dict" key exists)
            if 'model_state_dict' in state_dict:
                state_dict = state_dict['model_state_dict']
            elif 'state_dict' in state_dict:
                state_dict = state_dict['state_dict']
            
            # Filter out 'fc' keys to avoid size mismatch
            state_dict = {k: v for k, v in state_dict.items() if not k.startswith('fc.')}
                
            self.model.load_state_dict(state_dict, strict=False)
            print(f"✓ Loaded local ResNet weights from {weights_path}")
        except Exception as e:
            print(f"⚠️ Failed to load local weights: {e}. Using random init (Not recommended).")
        
        # Remove the classification head (fc) to get raw embeddings (2048 dim)
        self.model.fc = nn.Identity()
        
        self.model = self.model.to(self.device)
        self.model.eval()
        
        # Standard ImageNet Transforms
        self.preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                                 std=[0.229, 0.224, 0.225]),
        ])

    def get_embedding(self, image_bytes):
        """
        Converts image bytes to 2048-dim embedding via ResNet50.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            input_tensor = self.preprocess(image)
            input_batch = input_tensor.unsqueeze(0).to(self.device) # Batch size 1
            
            with torch.no_grad():
                embedding = self.model(input_batch)
                
            # Return as numpy array or tensor (CPU)
            return embedding.cpu().squeeze(0) 
            
        except Exception as e:
            print(f"Image Embedding Error: {e}")
            return torch.zeros(2048) # Fallback

# Test
if __name__ == "__main__":
    embedder = ImageEmbedder()
    # Mock image
    # embedder.get_embedding(b'...')
