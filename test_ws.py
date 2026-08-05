import asyncio
import websockets
import json

async def test():
    async with websockets.connect('ws://127.0.0.1:8000/ws') as websocket:
        print("Connected!")
        await websocket.send(json.dumps({"type": "bg_update", "bg": "/Users/mac/Documents/MagicCamAI/desktop/src/renderer/assets/bg_livingroom.jpg"}))
        print("Sent config")

asyncio.run(test())
