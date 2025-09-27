import uuid
import secrets
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi import status
from collections import deque
import math
import hashlib
from playerdb import get_player, create_player, update_player, Player

app = FastAPI()

# --- Password hashing helpers ---
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()
# --- WebSockets Endpoints (Corrected) ---

# --- REST Endpoints ---

@app.post("/auth/login")
async def login(request: Request):
    data = await request.json()
    userid = data.get("userid")
    password = data.get("password")
    if not userid or not password:
        return JSONResponse({"success": False, "error": "Missing userid or password."}, status_code=status.HTTP_400_BAD_REQUEST)
    player = get_player(userid)
    if not player or not hasattr(player, "password_hash"):
        return JSONResponse({"success": False, "error": "Invalid credentials."}, status_code=status.HTTP_401_UNAUTHORIZED)
    if player.password_hash != hash_password(password):
        return JSONResponse({"success": False, "error": "Invalid credentials."}, status_code=status.HTTP_401_UNAUTHORIZED)
    return {"success": True, "userid": userid, "elo": player.elo}


@app.post("/auth/register")
async def register(request: Request):
    data = await request.json()
    userid = data.get("userid")
    password = data.get("password")
    if not userid or not password:
        return JSONResponse({"success": False, "error": "Missing userid or password."}, status_code=status.HTTP_400_BAD_REQUEST)
    if get_player(userid):
        return JSONResponse({"success": False, "error": "User already exists."}, status_code=status.HTTP_409_CONFLICT)
    player = Player(id=userid, elo=1000, password_hash=hash_password(password))
    create_player(player)
    return {"success": True, "userid": userid, "elo": 1000}


@app.post("/update-elo")
async def update_elo(request: Request):
    data = await request.json()
    userid = data.get("userid")
    sessionid = data.get("sessionid")
    win = data.get("win")
    if not userid or sessionid is None or win is None:
        return JSONResponse({"success": False, "error": "Missing parameters."}, status_code=status.HTTP_400_BAD_REQUEST)
    player = get_player(userid)
    if not player:
        return JSONResponse({"success": False, "error": "User not found."}, status_code=status.HTTP_404_NOT_FOUND)
    # Update elo: +20 for win, -20 for loss
    if win:
        player.elo += 20
    else:
        player.elo -= 20
    update_player(player)
    return {"success": True, "userid": userid, "elo": player.elo}

# --- Connection Manager for Broadcasting ---
class ConnectionManager:
    def __init__(self):
        # Maps session_id to a list of active connections
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        # The key fix: Only allow 2 players per session
        if len(self.active_connections[session_id]) >= 2:
            await websocket.close(code=1008, reason="Session is full.")
            return False
        self.active_connections[session_id].append(websocket)
        return True

    async def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            # If anyone disconnects, close all remaining connections and delete session
            for ws in list(self.active_connections[session_id]):
                try:
                    await ws.close(code=1011, reason="Opponent disconnected. Session closed.")
                except Exception:
                    pass
            del self.active_connections[session_id]

    async def broadcast(self, message: str, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                if connection != websocket:
                    await connection.send_text(message)

# --- Matchmaking Logic (with disconnect handling) ---
class DynamicMatchmaker:
    def __init__(self, bracket_size=200):
        self.queues = {}
        self.bracket_size = bracket_size
        # The key fix: Map websockets to their removal info
        self.ws_map = {}

    def _get_bracket_key(self, elo):
        return math.floor((elo - 1) / self.bracket_size) if elo > 0 else 0

    def add_player(self, player, ws: WebSocket):
        elo = player.get('elo', 0)
        bracket_key = self._get_bracket_key(elo)
        
        if bracket_key not in self.queues:
            self.queues[bracket_key] = deque()
        
        queue = self.queues[bracket_key]
        queue.append((player, ws))
        
        # Map this websocket so we can find it on disconnect
        self.ws_map[ws] = (queue, (player, ws))
        
        if len(queue) >= 2:
            p1, ws1 = queue.popleft()
            p2, ws2 = queue.popleft()
            
            # Clean up the ws_map for the matched players
            del self.ws_map[ws1]
            del self.ws_map[ws2]
            
            if not queue:
                del self.queues[bracket_key]
            
            return [(p1, ws1), (p2, ws2)]
        return None

    def remove_player(self, ws: WebSocket):
        if ws in self.ws_map:
            queue, player_tuple = self.ws_map[ws]
            try:
                queue.remove(player_tuple)
                print(f"Player {player_tuple[0]['user_id']} removed from queue on disconnect.")
            except ValueError:
                # Player was already matched and removed, do nothing
                pass
            del self.ws_map[ws]



# --- Globals ---
matchmaker = DynamicMatchmaker()
manager = ConnectionManager()
# Track active session IDs
active_sessions = set()



# --- WebSockets Endpoints (Corrected) ---

@app.websocket("/matchmaking")
async def matchmaking_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        player = {"user_id": data.get("user_id", str(uuid.uuid4())), "elo": data.get("elo", 100)}
        
        match = matchmaker.add_player(player, websocket)
        
        if match:
            # Use a short, unique session_id (8-10 chars, url-safe)
            session_id = secrets.token_urlsafe(6)
            active_sessions.add(session_id)
            p1_data, p1_ws = match[0]
            p2_data, p2_ws = match[1]

            await p1_ws.send_json({"event": "match_found", "session_id": session_id, "opponent": p2_data})
            await p2_ws.send_json({"event": "match_found", "session_id": session_id, "opponent": p1_data})
            # Close the matchmaking connections gracefully
            await p1_ws.close()
            await p2_ws.close()
        else:
            # Keep connection open while waiting in queue
            while True:
                await asyncio.sleep(1) # Keep alive
    except WebSocketDisconnect:
        # Solution: Handle disconnects from the queue
        matchmaker.remove_player(websocket)


@app.websocket("/match/{session_id}")
async def match_ws(websocket: WebSocket, session_id: str):
    # Only allow joining if session is active
    if session_id not in active_sessions:
        await websocket.close(code=4000, reason="Session expired or does not exist.")
        return
    is_connected = await manager.connect(websocket, session_id)
    if not is_connected:
        return # Session was full

    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, websocket, session_id)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, session_id)
        # Remove session from active_sessions if destroyed
        if session_id not in manager.active_connections:
            active_sessions.discard(session_id)