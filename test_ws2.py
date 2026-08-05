import asyncio
import websockets
import json
import base64
import os

async def test():
    async with websockets.connect('ws://127.0.0.1:8000/ws') as websocket:
        print("Connected!")
        await websocket.send(json.dumps({"type": "id_update", "id": "/Users/mac/Documents/MagicCamAI/desktop/src/renderer/assets/id_person1.jpg"}))
        print("Sent config")
        
        # Now send a fake 640x480 frame
        import numpy as np
        import cv2
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', frame)
        await websocket.send(buffer.tobytes())
        print("Sent frame!")
        
        # Wait for reply
        try:
            reply = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"Received reply of size {len(reply)}!")
        except Exception as e:
            print(f"Error waiting for reply: {e}")

asyncio.run(test())
