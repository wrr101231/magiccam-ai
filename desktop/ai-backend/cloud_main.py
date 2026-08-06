import sys
import os
import cv2
import numpy as np
import base64
import json
import urllib.request
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

app = FastAPI()

# =========================================================
# MAGIC CAM AI - CLOUD GPU ENGINE (Real-Time LivePortrait)
# =========================================================

# ----- 1. Setup Mediapipe Tasks API for Background Replacement -----
try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    
    MODEL_PATH = 'selfie_segmenter.tflite'
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading {MODEL_PATH} for background replacement...")
        urllib.request.urlretrieve("https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite", MODEL_PATH)
        
    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.ImageSegmenterOptions(base_options=base_options, output_category_mask=True)
    segmenter = vision.ImageSegmenter.create_from_options(options)
    print("Mediapipe Image Segmenter initialized.")
except Exception as e:
    print(f"WARNING: Background replacement disabled. Error: {e}")
    segmenter = None

# ----- 2. Setup LivePortrait Engine -----
try:
    import torch
    sys.path.append(os.getcwd())
    from src.config.inference_config import InferenceConfig
    from src.config.crop_config import CropConfig
    from src.utils.cropper import Cropper
    from src.live_portrait_wrapper import LivePortraitWrapper
    from src.utils.crop import prepare_paste_back, paste_back
    
    inf_cfg = InferenceConfig()
    crop_cfg = CropConfig()
    lp_wrapper = LivePortraitWrapper(inference_cfg=inf_cfg)
    cropper = Cropper(crop_cfg=crop_cfg)
    print("LivePortrait Pipeline initialized on CUDA.")
    has_lp = True
except Exception as e:
    print(f"WARNING: Torch/LivePortrait not fully available. Running in Stub mode. Error: {e}")
    has_lp = False

source_info = None

def prepare_identity(identity_img_bgr):
    global source_info
    if not has_lp: return
    img_rgb = cv2.cvtColor(identity_img_bgr, cv2.COLOR_BGR2RGB)
    
    crop_info = cropper.crop_single_image(img_rgb)
    if crop_info is None:
        print("Failed to detect face in identity image!")
        source_info = None
        return
        
    # Extract source tensors
    I_s = lp_wrapper.prepare_source(img_rgb)
    x_s_info = lp_wrapper.get_kp_info(I_s)
    x_s = lp_wrapper.transform_keypoint(x_s_info)
    f_s = lp_wrapper.extract_feature_3d(I_s)
    
    source_info = {
        'crop_info': crop_info,
        'I_s': I_s,
        'x_s_info': x_s_info,
        'x_s': x_s,
        'f_s': f_s,
        'x_c_s': x_s_info['kp'],
        'R_s': x_s_info['R'],
        'img_shape': img_rgb.shape,
        'M_c2o': crop_info['M_c2o'],
        'img': img_rgb
    }
    print("Identity prepared successfully!")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("MagicCamAI Client connected to Cloud Node!")
    
    current_bg_img = None
    first_driving_info = None
    
    try:
        while True:
            message = await websocket.receive()
            
            # Handle Configuration (Identity and Background Updates)
            if "text" in message:
                config = json.loads(message["text"])
                if config.get("type") == "bg_update":
                    bg_data = config.get("bg")
                    if bg_data and bg_data.startswith("data:"):
                        encoded = bg_data.split(",")[1]
                        current_bg_img = cv2.imdecode(np.frombuffer(base64.b64decode(encoded), np.uint8), cv2.IMREAD_COLOR)
                
                elif config.get("type") == "id_update":
                    id_data = config.get("id")
                    if id_data and id_data.startswith("data:"):
                        encoded = id_data.split(",")[1]
                        current_identity_img = cv2.imdecode(np.frombuffer(base64.b64decode(encoded), np.uint8), cv2.IMREAD_COLOR)
                        prepare_identity(current_identity_img)
                        first_driving_info = None # Reset anchor
            
            # Handle Streaming Video Frames
            elif "bytes" in message:
                data = message["bytes"]
                img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
                
                if img is None: continue
                processed_img = img
                
                # ---- 1. Generative AI Full Head/Body Animation (LivePortrait) ----
                if has_lp and source_info is not None:
                    try:
                        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                        d_crop_info = cropper.crop_single_image(img_rgb)
                        
                        if d_crop_info is not None:
                            # Preprocess driving frame
                            I_d_i = lp_wrapper.prepare_videos([d_crop_info['img_crop_256x256']])[0]
                            x_d_i_info = lp_wrapper.get_kp_info(I_d_i.unsqueeze(0))
                            
                            if first_driving_info is None:
                                first_driving_info = {
                                    'R': x_d_i_info['R'].clone(),
                                    'exp': x_d_i_info['exp'].clone(),
                                    'scale': x_d_i_info['scale'].clone(),
                                    't': x_d_i_info['t'].clone()
                                }
                            
                            # Calculate motion
                            R_new = (x_d_i_info['R'] @ first_driving_info['R'].permute(0, 2, 1)) @ source_info['R_s']
                            delta_new = source_info['x_s_info']['exp'] + (x_d_i_info['exp'] - first_driving_info['exp'])
                            scale_new = source_info['x_s_info']['scale'] * (x_d_i_info['scale'] / first_driving_info['scale'])
                            t_new = source_info['x_s_info']['t'] + (x_d_i_info['t'] - first_driving_info['t'])
                            
                            x_d_i_new = scale_new * (source_info['x_c_s'] @ R_new + delta_new) + t_new
                            x_d_i_new = lp_wrapper.stitch(source_info['x_s'], x_d_i_new)
                            
                            # Decode
                            out = lp_wrapper.warp_decode(source_info['f_s'], source_info['x_s'], x_d_i_new)
                            out_img = lp_wrapper.parse_output(out)[0]
                            
                            # Paste back
                            mask_ori_float = prepare_paste_back(inf_cfg.mask_crop, source_info['M_c2o'], dsize=(source_info['img_shape'][1], source_info['img_shape'][0]))
                            res = paste_back(out_img, source_info['M_c2o'], source_info['img'], mask_ori_float)
                            processed_img = cv2.cvtColor(res, cv2.COLOR_RGB2BGR)
                    except Exception as e:
                        # Fallback to original frame if face not detected
                        print(f"Error processing frame: {e}")
                        pass
                
                # ---- 2. Segmentation & Background Replacement ----
                if segmenter is not None and current_bg_img is not None:
                    try:
                        img_rgb = cv2.cvtColor(processed_img, cv2.COLOR_BGR2RGB)
                        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                        results = segmenter.segment(mp_image)
                        
                        mask = results.category_mask.numpy_view()
                        # Output mask: foreground is typically 0, background is >0 (or vice versa depending on model)
                        # The selfie_segmenter returns 0 for background, 1-255 for person.
                        mask = (mask > 0).astype(np.float32)
                        mask = cv2.GaussianBlur(mask, (5, 5), 0)
                        mask_3d = np.stack((mask,) * 3, axis=-1)
                        
                        bg = cv2.resize(current_bg_img, (processed_img.shape[1], processed_img.shape[0]))
                        bg = cv2.GaussianBlur(bg, (15, 15), 0)
                        processed_img = (processed_img * mask_3d + bg * (1 - mask_3d)).astype(np.uint8)
                    except Exception as e:
                        pass
                
                _, buffer = cv2.imencode('.jpg', processed_img, [cv2.IMWRITE_JPEG_QUALITY, 80])
                await websocket.send_bytes(buffer.tobytes())
                
    except WebSocketDisconnect:
        print("Client disconnected.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
