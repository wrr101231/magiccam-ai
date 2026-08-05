# MagicCamAI Cloud GPU Deployment (RunPod)

To achieve real-time full-body generative avatars like Decart AI, you must deploy this backend to a Cloud GPU instance. An Intel Mac cannot run LivePortrait in real time.

## Deployment Steps on RunPod

1. Create an account on [RunPod.io](https://www.runpod.io/).
2. Navigate to **Pods** and click **Deploy**.
3. Select an RTX 4090 or A100 template (PyTorch).
4. SSH into your Pod or use the Web Terminal.
5. Clone the LivePortrait repository and install requirements:
   ```bash
   git clone https://github.com/KwaiVGI/LivePortrait.git
   cd LivePortrait
   pip install -r requirements.txt
   ```
6. Upload `cloud_main.py` from this folder to the Pod.
7. Install FastAPI dependencies:
   ```bash
   pip install fastapi uvicorn websockets opencv-python mediapipe
   ```
8. Run the MagicCamAI Cloud Server:
   ```bash
   python cloud_main.py
   ```
9. Expose port 8000 on RunPod (TCP) and get your Public Pod URL.
10. In the MagicCamAI Desktop App, open **Settings -> Cloud & API Configuration**, and enter your RunPod WebSocket URL (e.g., `wss://<pod-id>-8000.proxy.runpod.net/ws`).

Once connected, your desktop app will stream webcam frames directly to the cloud GPU for LivePortrait full-head animation!
