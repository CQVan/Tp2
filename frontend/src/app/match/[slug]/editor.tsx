
"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import Editor, { OnMount } from "@monaco-editor/react";

export default function MatchPage() {
    // UI and Editor state
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const [code, setCode] = useState<string>("// Your code here!");
    const editorRef = useRef<any>(null);

    // Network and Game State
    const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  
    // Refs for persistent network objects
    const ws = useRef<WebSocket | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);

    // This is the main effect for all networking
    useEffect(() => {
        // 1. Retrieve match data from localStorage
        const opponentData = JSON.parse(localStorage.getItem("opponent") || "{}");
        const role = localStorage.getItem("role");
        const token = localStorage.getItem("authToken");

        if (!opponentData.id || !role || !token) {
            setConnectionStatus("Error: Missing match data.");
            return;
        }

        // 2. Connect to the signaling server
        ws.current = new WebSocket("ws://127.0.0.1:8000/ws");

        ws.current.onopen = () => {
            setConnectionStatus("Signaling server connected...");
            // Authenticate this connection
            ws.current?.send(JSON.stringify({ token }));
            // Start the WebRTC handshake
            initializePeerConnection(role, opponentData.id);
        };

        // 3. Listen for signaling messages
        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleSignalingData(message);
        };

        // 4. Cleanup on component unmount
        return () => {
            ws.current?.close();
            peerConnection.current?.close();
        };
    }, []); // Empty array ensures this runs only once

    // --- WebRTC Core Functions ---

    const initializePeerConnection = async (role: string, opponentId: string) => {
        // Use public STUN servers for NAT traversal
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerConnection.current = pc;
        setConnectionStatus("Creating P2P connection...");

        // Send any found network candidates to the other peer via the server
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({
                    event: "webrtc_ice_candidate",
                    target: opponentId,
                    data: event.candidate,
                });
            }
        };

        // The 'offerer' creates the data channel
        if (role === "offerer") {
            const dc = pc.createDataChannel("gameData");
            dataChannel.current = dc;
            setupDataChannelEvents(dc);
      
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({ event: "webrtc_offer", target: opponentId, data: offer });
        } else {
            // The 'answerer' waits for the offerer to create the channel
            pc.ondatachannel = (event) => {
                const dc = event.channel;
                dataChannel.current = dc;
                setupDataChannelEvents(dc);
            };
        }
    };

    const handleSignalingData = async (message: any) => {
        const pc = peerConnection.current;
        if (!pc) return;

        switch (message.event) {
            case "webrtc_offer":
                await pc.setRemoteDescription(new RTCSessionDescription(message.data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal({ event: "webrtc_answer", target: message.from, data: answer });
                break;
            case "webrtc_answer":
                await pc.setRemoteDescription(new RTCSessionDescription(message.data));
                break;
            case "webrtc_ice_candidate":
                if (message.data) {
                    await pc.addIceCandidate(new RTCIceCandidate(message.data));
                }
                break;
        }
    };

    const setupDataChannelEvents = (dc: RTCDataChannel) => {
        dc.onopen = () => {
            setConnectionStatus("✅ P2P Connection Established!");
            ws.current?.close(); // No longer need the signaling server
        };
        dc.onclose = () => setConnectionStatus("Connection closed.");
        dc.onmessage = (event) => {
            console.log("Opponent says:", event.data);
            // TODO: Handle incoming messages (chat, game events, etc.)
        };
    };
  
    const sendSignal = (data: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    };

    // Your existing editor functions...
    const handleEditorMount: OnMount = (editor) => { editorRef.current = editor; };
    useEffect(() => { editorRef.current?.layout(); }, [sidebarWidth]);

    return (
        <div>
            <div className="flex justify-center gap-4">
                {/* You can show the status for debugging */}
                <p className="font-bold">{connectionStatus}</p>
                <button>Run</button>
                <button>Submit</button>
            </div>
            <div className="flex h-screen">
                <Sidebar
                    minWidth={150}
                    maxWidth={500}
                    width={sidebarWidth}
                    onResize={(w) => setSidebarWidth(w)}
                >
                    <h1 className="text-white text-lg font-bold m-4">Title</h1>
                    <p className="text-gray-300 m-4">Prompt goes here</p>
                </Sidebar>
                <div className="flex-1" style={{ width: `calc(100% - ${sidebarWidth}px)` }}>
                    <div>
                        <select
                            className="bg-gray-800 text-white rounded px-2 py-1 mb-2"
                            onChange={(e) => {/* Optionally set language state here if you want to support multiple languages */}}
                            defaultValue="javascript"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                        </select>
                    </div>
                    <Editor
                        height="100%"
                        language={"javascript"}
                        value={code}
                        onChange={(value) => setCode(value || "")}
                        onMount={handleEditorMount}
                    />
                </div>
            </div>
        </div>
    );
}
