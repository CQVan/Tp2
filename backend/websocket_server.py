import uuid
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from collections import deque
import math

app = FastAPI()

class DynamicMatchmaker:
    def __init__(self, bracket_size=200):
        self.queues = {}
        self.bracket_size = bracket_size

    def _get_bracket_key(self, elo):
        if elo <= 0:
            return 0
        return math.floor((elo - 1) / self.bracket_size)

    def add_player(self, player, ws):
        elo = player.get('elo', 0)
        bracket_key = self._get_bracket_key(elo)
        if bracket_key not in self.queues:
            self.queues[bracket_key] = deque()
        queue = self.queues[bracket_key]
        queue.append((player, ws))
        if len(queue) >= 2:
            p1, ws1 = queue.popleft()
            p2, ws2 = queue.popleft()
            if not queue:
                del self.queues[bracket_key]
            return [(p1, ws1), (p2, ws2)]
        return None

matchmaker = DynamicMatchmaker()
sessions = {}

@app.websocket("/matchmaking")
async def matchmaking_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            # Example: {"user_id": "player1", "elo": 350}
            player = {"user_id": data.get("user_id", str(uuid.uuid4())), "elo": data.get("elo", 100)}
            match = matchmaker.add_player(player, websocket)
            if match:
                session_id = str(uuid.uuid4())
                sessions[session_id] = [ws for _, ws in match]
                for p, ws in match:
                    await ws.send_json({"event": "match_found", "session_id": session_id, "opponent": [x[0] for x in match if x[0]["user_id"] != p["user_id"]][0]})
    except WebSocketDisconnect:
        pass

@app.websocket("/match/{session_id}")
async def match_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in sessions:
        await websocket.close()
        return
    # Enforce max 2 players per session
    if len(sessions[session_id]) >= 2:
        # Notify all clients in session and the new one to return to matchmaking
        for ws in sessions[session_id]:
            try:
                await ws.send_json({"event": "session_closed", "reason": "Too many players joined. Returning to matchmaking."})
                await ws.close()
            except Exception:
                pass
        try:
            await websocket.send_json({"event": "session_closed", "reason": "Too many players joined. Returning to matchmaking."})
            await websocket.close()
        except Exception:
            pass
        del sessions[session_id]
        return
    sessions[session_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all in session except sender
            for ws in sessions[session_id]:
                if ws != websocket:
                    await ws.send_text(data)
    except WebSocketDisconnect:
        sessions[session_id].remove(websocket)
        if not sessions[session_id]:
            del sessions[session_id]
