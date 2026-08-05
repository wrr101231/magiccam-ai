#!/bin/bash

# Navigate to the backend directory
cd /Users/mac/Documents/MagicCamAI/desktop/ai-backend

# Activate the virtual environment
source venv/bin/activate

echo "Installing InsightFace and ONNX Runtime dependencies..."
pip install onnxruntime onnx sympy coloredlogs
pip install --no-deps insightface

echo "Creating models directory..."
mkdir -p models
cd models

echo "Downloading inswapper_128.onnx (This is ~500MB and may take a few minutes)..."
curl -L -O https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx

echo "Setup complete! You can now launch the MagicCamAI app."
