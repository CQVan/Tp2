# --- All your existing imports ---
import hashlib
import jwt
from datetime import datetime, timedelta
from collections import deque
import math
from playerdb import get_player, create_player, update_player, Player
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from fastapi import FastAPI, Query, WebSocket, Request, WebSocketDisconnect, status, Depends
from fastapi.responses import JSONResponse

# --- Config Manager (restored from previous version) ---
class ConfigManager:
    def __init__(self, file_path="config.json"):
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                self._config = json.load(f)
        else:
            # Default config if file doesn't exist
            self._config = {
                "starting_elo": 1000,
                "bracket_size": 200,
                "jwt_secret": "your-super-secret-key-change-me",
                "jwt_algorithm": "HS256",
                "jwt_expire_time": 30
            }
    def get_config(self, item: str):
        return self._config.get(item)

config = ConfigManager()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SHA256 Password Hashing Helper ---
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# --- JWT Token Decoding Helper (restored from previous version) ---
def decode_token(token: str):
    try:
        payload = jwt.decode(token, config.get_config("jwt_secret"), algorithms=[config.get_config("jwt_algorithm")])
        return {"valid": True, "data": payload}
    except jwt.ExpiredSignatureError:
        return {"valid": False, "error": "Token has expired."}
    except jwt.InvalidTokenError:
        return {"valid": False, "error": "Invalid token."}

# --- MODIFIED REST Endpoints ---

@app.post("/auth/login")
async def login(request: Request):
    data = await request.json()
    userid = data.get("userid")
    password = data.get("password")
    
    player = get_player(userid)
    if not player or player.password_hash != hash_password(password):
        return JSONResponse(
            {"success": False, "error": "Invalid credentials."},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    # Create JWT
    expire = datetime.utcnow() + timedelta(minutes=config.get_config("jwt_expire_time"))
    payload = {"sub": userid, "exp": expire}
    token = jwt.encode(payload, config.get_config("jwt_secret"), algorithm=config.get_config("jwt_algorithm"))

    return {"success": True, "token": token}

@app.post("/auth/register")
async def register(request: Request):
    data = await request.json()
    userid = data.get("userid")
    password = data.get("password")
    if not userid or not password:
        return JSONResponse({"success": False, "error": "Missing userid or password."}, status_code=status.HTTP_400_BAD_REQUEST)
    if get_player(userid):
        return JSONResponse({"success": False, "error": "User already exists."}, status_code=status.HTTP_409_CONFLICT)
    
    # Use the sha256 hash function
    player = Player(id=userid, elo=config.get_config("starting_elo"), password_hash=hash_password(password))
    create_player(player)
    
    # Create JWT
    expire = datetime.utcnow() + timedelta(minutes=config.get_config("jwt_expire_time"))
    payload = {"sub": userid, "exp": expire}
    token = jwt.encode(payload, config.get_config("jwt_secret"), algorithm=config.get_config("jwt_algorithm"))
    
    return {"success": True, "token": token}

@app.get("/getUserById")
async def get_user_by_id(userid: str = Query(...)):
    player = get_player(userid)
    if not player:
        return JSONResponse({"success": False, "error": "User not found."}, status_code=404)
    return {
        "success": True,
        "userid": player.id,
        "elo": player.elo
    }

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

class ConfigManager:
    def __init__(self, file_path="config.json"):
        # Load the JSON file into a dictionary when the class is initialized
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                self._config = json.load(f)
        else:
            self._config = {}

    def get_config(self, item: str):
        # Return the value for the key, or None if it doesn’t exist
        return self._config.get(item)

# --- Connection Manager for Broadcasting ---
class SignalingManager:
    """Manages active WebSocket connections for signaling purposes."""
    def __init__(self):
        # Maps userid to their active WebSocket connection
        self.active_connections: dict[str, WebSocket] = {}

    # CHANGE: Renamed from 'connect' and no longer calls accept().
    # The endpoint now handles accepting the connection.
    def register(self, userid: str, websocket: WebSocket):
        """Registers an authenticated user's WebSocket connection."""
        self.active_connections[userid] = websocket
        print(f"User {userid} registered for signaling.")

    def disconnect(self, userid: str):
        """Removes a user's connection."""
        if userid in self.active_connections:
            del self.active_connections[userid]
            print(f"User {userid} disconnected.")

    async def forward_message(self, sender_userid: str, message: dict):
        # ... (This method is unchanged)
        target_userid = message.get("target")
        if not target_userid:
            return
        recipient_ws = self.active_connections.get(target_userid)
        if recipient_ws:
            message["from"] = sender_userid
            await recipient_ws.send_json(message)
        else:
            print(f"Warning: Could not find target user {target_userid} to forward message.")
# --- Matchmaking Logic (with disconnect handling) ---
class DynamicMatchmaker:
    def __init__(self):
        self.queues = {}
        self.bracket_size = config.get_config("bracket_size")
        # Maps websockets to their removal info (userid, bracket_key)
        self.ws_map = {}

    def _get_bracket_key(self, elo):
        return math.floor((elo - 1) / self.bracket_size) if elo > 0 else 0

    def add_player(self, player: Player, ws: WebSocket):
        bracket_key = self._get_bracket_key(player.elo)
        
        if bracket_key not in self.queues:
            self.queues[bracket_key] = deque()
        
        queue = self.queues[bracket_key]
        # Store player object and websocket
        queue.append((player, ws))
        
        # Map this websocket for easy removal on disconnect
        self.ws_map[ws] = (player.id, bracket_key)
        
        if len(queue) >= 2:
            p1, ws1 = queue.popleft()
            p2, ws2 = queue.popleft()
            
            # Clean up the ws_map for the matched players
            del self.ws_map[ws1]
            del self.ws_map[ws2]
            
            return [(p1, ws1), (p2, ws2)]
        return None

    def remove_player(self, ws: WebSocket):
        if ws in self.ws_map:
            userid, bracket_key = self.ws_map[ws]
            queue = self.queues.get(bracket_key)
            if queue:
                # Rebuild the deque without the disconnected player
                self.queues[bracket_key] = deque([(p, w) for p, w in queue if p.id != userid])
            del self.ws_map[ws]
            print(f"Player {userid} removed from queue on disconnect.")


# --- Globals ---
config = ConfigManager()
matchmaker = DynamicMatchmaker()
manager = SignalingManager()
# Track active session IDs
active_sessions = set()

# --- WebSockets Endpoints (Corrected) ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    userid = None
    
    # FIX 1: Accept the connection IMMEDIATELY upon arrival.
    await websocket.accept()
    
    try:
        # Now that we've accepted, we can wait for the first message.
        initial_data = await websocket.receive_json()
        token = initial_data.get("token")
        
        token_payload = decode_token(token)
        if not token_payload["valid"]:
            await websocket.close(code=4001, reason="Invalid or expired token.")
            return

        userid = token_payload["data"]["sub"]
        player = get_player(userid)
        if not player:
            await websocket.close(code=4004, reason="Player not found.")
            return
            
        # FIX 2: Register the now-authenticated connection in the manager.
        manager.register(userid, websocket)

        # 2. ADD TO MATCHMAKING QUEUE (The rest of your logic is correct)
        match = matchmaker.add_player(player, websocket)
        
        if match:
            # 3. MATCH FOUND
            (p1, ws1), (p2, ws2) = match
            
            await ws1.send_json({
                "event": "match_found",
                "opponent": {"id": p2.id, "elo": int(p2.elo)},
                "role": "offerer"
            })
            
            await ws2.send_json({
                "event": "match_found",
                "opponent": {"id": p1.id, "elo": int(p1.elo)},
                "role": "answerer"
            })
        
        # 4. LISTEN FOR AND FORWARD SIGNALING MESSAGES
        while True:
            data = await websocket.receive_json()
            event_type = data.get("event")
            if event_type in ["webrtc_offer", "webrtc_answer", "webrtc_ice_candidate"]:
                await manager.forward_message(userid, data)

    except WebSocketDisconnect:
        if userid:
            manager.disconnect(userid)
            matchmaker.remove_player(websocket)
    except Exception as e:
        print(f"An error occurred with user {userid}: {e}")
        if userid:
            manager.disconnect(userid)
            matchmaker.remove_player(websocket)