"""
model.py — Neural network definitions, robust checkpoint loading, and inference.
Synchronized with Colab notebook CustomPlantCNN and ResNet18 training code.
"""
import io
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import numpy as np
import streamlit as st

import config


# ---------------------------------------------------------
# Custom CNN (Matches Notebook CustomPlantCNN Architecture)
# ---------------------------------------------------------
class CustomCNN(nn.Module):
    def __init__(self, num_classes=config.NUM_CLASSES):
        super(CustomCNN, self).__init__()
        
        # Convolutional Block 1
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        
        # Convolutional Block 2
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        
        # Convolutional Block 3
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        
        # Pooling & Dropout
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout = nn.Dropout(0.25)
        
        # Dense Layers & 1D Batch Normalization
        self.fc1 = nn.Linear(128 * 28 * 28, 512)
        self.bn4 = nn.BatchNorm1d(512)
        self.fc2 = nn.Linear(512, num_classes)

    def forward(self, x):
        x = self.pool(F.relu(self.bn1(self.conv1(x))))
        x = self.pool(F.relu(self.bn2(self.conv2(x))))
        x = self.pool(F.relu(self.bn3(self.conv3(x))))
        x = self.dropout(x)

        x = x.view(-1, 128 * 28 * 28)
        x = F.relu(self.bn4(self.fc1(x)))
        x = self.dropout(x)
        x = self.fc2(x)
        return x


# ---------------------------------------------------------
# Transfer Learning Model (ResNet-18)
# ---------------------------------------------------------
def get_resnet18(num_classes=config.NUM_CLASSES):
    model = models.resnet18(weights=None)
    in_features = model.fc.in_features
    model.fc = nn.Linear(in_features, num_classes)
    return model


# ---------------------------------------------------------
# Image Transform Pipeline
# ---------------------------------------------------------
eval_transform = transforms.Compose([
    transforms.Resize((config.INPUT_SIZE, config.INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=config.NORM_MEAN, std=config.NORM_STD),
])


# ---------------------------------------------------------
# Checkpoint Stamp & Loader
# ---------------------------------------------------------
def model_stamp():
    """Generates modification timestamp tuple for cache management."""
    stamp1 = os.path.getmtime(config.PATH_1) if config.PATH_1.exists() else 0
    stamp2 = os.path.getmtime(config.PATH_2) if config.PATH_2.exists() else 0
    return (stamp1, stamp2)


@st.cache_resource
def load_all_models(stamp):
    """
    Loads PyTorch weights for both Custom CNN and ResNet18 models.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_1, model_2 = None, None
    errors = []

    # Primary Engine (Custom CNN)
    if not config.PATH_1.exists():
        errors.append(f"Primary engine weight file missing at `{config.PATH_1.name}`")
    else:
        try:
            m1 = CustomCNN(num_classes=config.NUM_CLASSES)
            state_dict = torch.load(config.PATH_1, map_location=device)
            m1.load_state_dict(state_dict)
            m1.to(device)
            m1.eval()
            model_1 = m1
        except Exception as e:
            errors.append(f"Failed to load `{config.PATH_1.name}`: {e}")

    # Secondary Engine (ResNet18)
    if not config.PATH_2.exists():
        errors.append(f"Secondary engine weight file missing at `{config.PATH_2.name}`")
    else:
        try:
            m2 = get_resnet18(num_classes=config.NUM_CLASSES)
            state_dict2 = torch.load(config.PATH_2, map_location=device)
            m2.load_state_dict(state_dict2)
            m2.to(device)
            m2.eval()
            model_2 = m2
        except Exception as e:
            errors.append(f"Failed to load `{config.PATH_2.name}`: {e}")

    return model_1, model_2, errors


# ---------------------------------------------------------
# Cached Inference Pipeline
# ---------------------------------------------------------
@st.cache_data
def predict_cached(image_bytes: bytes, engine_num: int, stamp):
    """
    Executes model inference on raw image bytes.
    Returns a NumPy array of probabilities corresponding to CLASS_NAMES.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_1, model_2, _ = load_all_models(stamp)
    model = model_1 if engine_num == 1 else model_2

    if model is None:
        raise RuntimeError(f"Engine {engine_num} is not loaded.")

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor_img = eval_transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor_img)
        probabilities = F.softmax(outputs, dim=1)[0].cpu().numpy()

    return probabilities