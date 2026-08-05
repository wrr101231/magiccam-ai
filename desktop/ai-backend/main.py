import cv2
import numpy as np
import base64
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import mediapipe as mp

app = FastAPI()

# Initialize MediaPipe Selfie Segmentation
mp_selfie_segmentation = mp.solutions.selfie_segmentation
segmenter = mp_selfie_segmentation.SelfieSegmentation(model_selection=1)

import os
import insightface

# Initialize InsightFace
face_analyzer = insightface.app.FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_analyzer.prepare(ctx_id=0, det_size=(640, 640))

model_path = os.path.join(os.path.dirname(__file__), 'models', 'inswapper_128.onnx')
try:
    face_swapper = insightface.model_zoo.get_model(model_path, providers=['CPUExecutionProvider'])
except Exception as e:
    print(f"Failed to load inswapper model: {e}")
    face_swapper = None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Electron client connected to AI Engine!")
    
    current_bg_img = None
    current_source_face = None
    
    try:
        while True:
            # Receive message (can be text/JSON for config or bytes for frames)
            message = await websocket.receive()
            
            if "text" in message:
                with open("backend_debug.log", "a") as f:
                    f.write(f"Received text message type: {json.loads(message['text']).get('type')}\n")
                try:
                    config = json.loads(message["text"])
                    if config.get("type") == "bg_update":
                        bg_data_url = config.get("bg")
                        if bg_data_url:
                            if bg_data_url.startswith("data:"):
                                encoded_data = bg_data_url.split(",")[1]
                                nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
                                current_bg_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                            else:
                                current_bg_img = cv2.imread(bg_data_url)
                        else:
                            current_bg_img = None
                    elif config.get("type") == "id_update":
                        id_data_url = config.get("id")
                        if id_data_url:
                            if id_data_url.startswith("data:"):
                                encoded_data = id_data_url.split(",")[1]
                                nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
                                id_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                            else:
                                id_img = cv2.imread(id_data_url)
                            
                            if id_img is not None:
                                with open("backend_debug.log", "a") as f: f.write("Decoded ID img successfully.\n")
                                try:
                                    faces = face_analyzer.get(id_img)
                                    if faces:
                                        current_source_face = faces[0]
                                        with open("backend_debug.log", "a") as f: f.write("Found face in ID image.\n")
                                    else:
                                        with open("backend_debug.log", "a") as f: f.write("No face found in ID image.\n")
                                except Exception as e:
                                    with open("backend_debug.log", "a") as f: f.write(f"Face analyzer error: {e}\n")
                        else:
                            current_source_face = None
                except Exception as e:
                    with open("backend_debug.log", "a") as f: f.write(f"Error parsing config: {e}\n")
                    print(f"Error parsing config: {e}")
                    
            elif "bytes" in message:
                # Process video frame
                data = message["bytes"]
                nparr = np.frombuffer(data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if img is not None:
                    # Apply Face Swap first
                    if current_source_face is not None and face_swapper is not None:
                        faces = face_analyzer.get(img)
                        if faces:
                            # Swap the first detected face in the camera stream
                            largest_face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
                            img = face_swapper.get(img, largest_face, current_source_face, paste_back=True)
                            with open("backend_debug.log", "a") as f: f.write("Face swapped successfully!\n")
                    
                    # Run segmentation
                    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    results = segmenter.process(img_rgb)
                    
                    if results.segmentation_mask is not None:
                        # Soften the mask for edge smoothing
                        mask = results.segmentation_mask
                        mask = cv2.GaussianBlur(mask, (5, 5), 0)
                        mask_3d = np.stack((mask,) * 3, axis=-1)
                        
                        # Apply background
                        if current_bg_img is not None:
                            if current_bg_img.shape != img.shape:
                                bg = cv2.resize(current_bg_img, (img.shape[1], img.shape[0]))
                            else:
                                bg = current_bg_img
                            
                            # Add slight blur to background for depth of field ("less stiff")
                            bg = cv2.GaussianBlur(bg, (15, 15), 0)
                            
                            # Continuous Alpha Blending
                            processed_img = (img * mask_3d + bg * (1 - mask_3d)).astype(np.uint8)
                        else:
                            # Just gray out background if none selected but AI is active
                            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                            bg = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
                            bg = cv2.GaussianBlur(bg, (15, 15), 0)
                            processed_img = (img * mask_3d + bg * (1 - mask_3d)).astype(np.uint8)
                    else:
                        processed_img = img

                    # Encode back to JPEG
                    _, buffer = cv2.imencode('.jpg', processed_img, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    
                    # Send back to Electron
                    await websocket.send_bytes(buffer.tobytes())
                
    except WebSocketDisconnect:
        print("Electron client disconnected.")
    except Exception as e:
        print(f"Error processing frame: {e}")

if __name__ == "__main__":
    print("Starting MagicCamAI Engine...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")
