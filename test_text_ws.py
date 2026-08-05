import asyncio
import websockets

async def test():
    async with websockets.connect("ws://127.0.0.1:8000/ws") as websocket:
        await websocket.send('{"type": "bg_update", "bg": "/test.jpg"}')
        print("Sent text message")
        msg = await websocket.recv()
        print("Received response length:", len(msg))

asyncio.run(test())
