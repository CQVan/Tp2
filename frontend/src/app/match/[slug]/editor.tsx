"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Editor, { OnMount } from "@monaco-editor/react";
import { get_compiler, RunResult } from "@/compilers/compiler";

interface Question {
  title: string;
  prompt: string;
  difficulty: string;
  target_func: string;
  test_cases: { inputs: any; outputs: any; }[];
}

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch (e) {
    return null;
  }
}

function ChatPanel({ messages, onSendMessage, currentUser }: {
  messages: any[];
  onSendMessage: (message: string) => void;
  currentUser: { userid: string } | null;
}) {
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto-scroll to the latest message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendMessage(chatInput);
      setChatInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 border-l-2 border-gray-700">
      <h2 className="text-white font-bold p-3 border-b border-gray-700">Match Chat</h2>
      <div className="flex-grow p-3 overflow-y-auto">
        {messages.map((msg, index) => {
          const isMe = msg.userid === currentUser?.userid;
          return (
            <div key={index} className={`mb-2 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-2 rounded-lg max-w-xs ${isMe ? 'bg-blue-600' : 'bg-gray-600'}`}>
                <p className="text-sm font-bold text-white">{isMe ? 'Me' : msg.userid}</p>
                <p className="text-white text-base break-words">{msg.payload.message}</p>
                <p className="text-xs text-gray-300 text-right mt-1">{new Date(msg.time).toLocaleTimeString()}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleFormSubmit} className="p-3 border-t border-gray-700">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a message..."
          className="w-full bg-gray-700 text-white p-2 rounded"
        />
      </form>
    </div>
  );
}

export default function MatchPage() {
  const router = useRouter();
    // UI and Editor state
    const [sidebarWidth, setSidebarWidth] = useState(400);
    const [code, setCode] = useState<Record<string,string>>({});
    const [language, setLanguage] = useState<string>("javascript");
    const editorRef = useRef<any>(null);

    // NEW: State for current user and chat messages
    const [currentUser, setCurrentUser] = useState<{ userid: string } | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [question, setQuestion] = useState<Question | null>(null);

    // Network and Game State
    const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  
    // Refs for persistent network objects
    const ws = useRef<WebSocket | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);

    // Add a state to track if P2P is established
    const [isPeerConnected, setIsPeerConnected] = useState(false);

    // Ref to store timeout for error handling
    const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    setCurrentUser({ userid: getUserIdFromToken(token)! });

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

    const handleConnectionLoss = () => {
        setConnectionStatus("⚠️ Signaling connection lost");
    };
    // 4. Handle connection close/error: redirect to matchmaking
    ws.current.onclose = handleConnectionLoss;
    ws.current.onerror = handleConnectionLoss;

    // 5. Cleanup on component unmount
    return () => {
      ws.current?.close();
      peerConnection.current?.close();
    };
  }, []);

    // --- WebRTC Core Functions ---

    const initializePeerConnection = async (role: string, opponentId: string) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerConnection.current = pc;
        setConnectionStatus("Creating P2P connection...");

        // Modify the connection state handler in initializePeerConnection
        pc.onconnectionstatechange = () => {
            // Clear any existing timeout
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
                errorTimeoutRef.current = null;
            }

            switch(pc.connectionState) {
                case 'connected':
                    setConnectionStatus("✅ P2P Connected");
                    setIsPeerConnected(true);
                    break;
                case 'disconnected':
                    setConnectionStatus("⚠️ Opponent disconnected");
                    setIsPeerConnected(false);
                    errorTimeoutRef.current = setTimeout(() => {
                        if (pc.connectionState === 'disconnected') {
                            router.push('/matchmaking');
                        }
                    }, 5000);
                    break;
                case 'failed':
                    setConnectionStatus("❌ Connection lost - Opponent left the match");
                    setIsPeerConnected(false);
                    errorTimeoutRef.current = setTimeout(() => {
                        if (pc.connectionState === 'failed') {
                            router.push('/matchmaking');
                        }
                    }, 5000);
                    break;
                case 'connecting':
                    setConnectionStatus("⏳ Establishing connection...");
                    break;
                default:
                    setConnectionStatus(`Connection state: ${pc.connectionState}`);
            }
        };

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
                try {
                    // Only create and add ICE candidate if there's actual candidate data
                    if (message.data && message.data.candidate) {
                        await pc.addIceCandidate(new RTCIceCandidate(message.data));
                    }
                } catch (error) {
                    console.error("Error adding ICE candidate:", error);
                }
                break;
        }
    };

    // MODIFIED: This function is now the core of our P2P communication
    const setupDataChannelEvents = (dc: RTCDataChannel) => {
        dc.onopen = () => {
            setConnectionStatus("✅ Data Channel Open");
            const role = localStorage.getItem("role");
            if (role === "offerer") {
                // Caller fetches and shares the question
                fetchAndShareQuestion();
            }
        };

        dc.onclose = () => {
            setConnectionStatus("⚠️ Data Channel Closed");
        };

        dc.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.event === 'chat') {
            setMessages((prevMessages) => [...prevMessages, data]);
          } else if (data.event === 'question_data') {
            setQuestion(data.payload);
          }
        };
      };
    const sendSignal = (data: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    };

    // NEW: Function to handle sending a chat message
    const handleSendMessage = (messageText: string) => {
      if (dataChannel.current?.readyState === 'open' && currentUser) {
        const message = {
          userid: currentUser.userid,
          event: 'chat',
          payload: {
            message: messageText,
          },
          time: new Date().toISOString(),
        };
        
        // Send the message over the data channel
        dataChannel.current.send(JSON.stringify(message));

        // Add the message to our own chat window immediately
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    };

    const fetchAndShareQuestion = async () => {
      const sessionId = localStorage.getItem("session_id");
      if (!sessionId) return;
  
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/question?sessionid=${sessionId}`);
        const data = await response.json();
        
        if (data.success && data.question) {
          setQuestion(data.question);
          
          // If we're the offerer, share the question with the opponent
          if (dataChannel.current?.readyState === 'open') {
            dataChannel.current.send(JSON.stringify({
              event: 'question_data',
              payload: data.question
            }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch question:", error);
      }
    };

    // Your existing editor functions...
    const handleEditorMount: OnMount = (editor) => { editorRef.current = editor; };
    useEffect(() => { editorRef.current?.layout(); }, [sidebarWidth]);

    function update_code(value : string | undefined){
      setCode(prev => ({
        ...prev,       // keep existing keys
        [language]: value ?? "",  // update the specific key
      }));
    }

    async function run_cases(amt : number | undefined = undefined){
      if(!question) throw "missing question"
      const compiler = get_compiler(language);
      
      for(let i = 0 ; i < (amt ?? question?.test_cases.length); i++){
        const inputs = question.test_cases[i].inputs;  
        const result : RunResult = await compiler.run(code[language], question.target_func, inputs);
        if(!result.output) {/** fail the test*/ return; }

        // show test passed
      }
    }

    return (
        <div className="flex h-screen bg-gray-900">
          {/* Left Panel: Problem Description */}
          <Sidebar
            minWidth={150}
            maxWidth={600}
            width={sidebarWidth}
            onResize={(w) => setSidebarWidth(w)}
          >
              <div className="flex flex-col h-full">
                <h1 className="text-white text-lg font-bold p-4 border-b border-gray-700 flex-shrink-0">{question ? question.title : 'Loading question...'}</h1>
                <div className="flex-1 overflow-y-auto">
                  <div className="text-gray-300 p-4">
                    {question ? (
                      <>
                        <p className="mb-4">{question.prompt}</p>
                        <div className="mt-4">
                          <h2 className="text-white font-bold mb-2">Test Cases:</h2>
                          {question.test_cases.map((testCase, index) => (
                            <div key={index} className="mb-2 p-2 bg-gray-800 rounded">
                              <div className="mb-2">
                                <span className="text-gray-400">Input:</span>
                                <pre className="mt-1 p-2 bg-gray-900 rounded overflow-x-auto">
                                  <code className="text-sm font-mono text-white">{JSON.stringify(testCase.input, null, 2)}</code>
                                </pre>
                              </div>
                              <div>
                                <span className="text-gray-400">Output:</span>
                                <pre className="mt-1 p-2 bg-gray-900 rounded overflow-x-auto">
                                  <code className="text-sm font-mono text-white">{JSON.stringify(testCase.output, null, 2)}</code>
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      'Waiting for question...' 
                    )}
                  </div>
                </div>
              </div>
          </Sidebar>
          
          {/* Center Panel: Code Editor */}
          <div className="flex-1 flex flex-col" style={{ width: `calc(100% - ${sidebarWidth}px - 350px)` }}>
            <div className="p-2 bg-gray-800 text-center text-white font-bold">{connectionStatus}</div>
            <div className="flex gap-2 p-2 bg-gray-800 justify-end">
              <select>
                <option value={"javascript"}>JavaScript</option>
                <option value={"python"}>Python</option>
              </select>
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-4 rounded">Test</button>
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-4 rounded">Submit</button>
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-4 rounded">Give Up</button>
            </div>
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code[language]}
              onChange={(value) => update_code(value)}
              onMount={(editor) => { editorRef.current = editor; }}
            />
          </div>

          {/* NEW: Right Panel: Chat */}
          <div className="w-[350px]">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
            />
          </div>
        </div>
    );
}
