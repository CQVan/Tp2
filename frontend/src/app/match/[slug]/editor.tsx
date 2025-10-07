"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Editor, { OnMount } from "@monaco-editor/react";
import { get_compiler } from "@/compilers/compiler";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Code, 
  Clock, 
  MessageCircle,
  Trophy,
  Flag,
  Zap,
  Terminal,
  FileCode2,
  TestTube,
  Upload
} from 'lucide-react';

interface Question {
  title: string;
  prompt: string;
  initial_code: Record<string, string>;
  difficulty: number;
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
    <Card className="h-full border-0 rounded-none shadow-none bg-white">
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          Match Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-5rem)] p-0">
        <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No messages yet. Say hello!
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.userid === currentUser?.userid;
              return (
                <div key={index} className={`mb-3 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                    <div className={`px-4 py-2 rounded-2xl ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                    }`}>
                      <p className={`text-xs font-medium mb-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                        {isMe ? 'You' : 'Opponent'}
                      </p>
                      <p className="text-sm break-words">{msg.payload.message}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 px-2 ${isMe ? 'text-right' : ''}`}>
                      {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleFormSubmit} className="p-4 bg-white border-t">
          <div className="flex gap-2">
            <Input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function MatchPage() {
  const router = useRouter();
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [code, setCode] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<string>("javascript");
  const editorRef = useRef<any>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{ userid: string } | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Initializing...");
  const [matchStartTime, setMatchStartTime] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(60 * 60 * 1000);
  const resultFinalizedRef = useRef<boolean>(false);
  const ws = useRef<WebSocket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const opponentData = JSON.parse(localStorage.getItem("opponent") || "{}");
    const roleFromStorage = localStorage.getItem("role");
    const token = localStorage.getItem("authToken");

    if (!opponentData.id || !roleFromStorage || !token) {
      setConnectionStatus("Error: Missing match data.");
      return;
    }

    setCurrentUser({ userid: getUserIdFromToken(token)! });
    setRole(roleFromStorage);
    setOpponentId(opponentData.id);
    setSessionId(localStorage.getItem("session_id"));

    const wsUrl = process.env.NEXT_PUBLIC_WSS_URL;
    if (!wsUrl) {
      setConnectionStatus("Error: WebSocket URL is not defined.");
      return;
    }
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setConnectionStatus("Signaling server connected...");
      ws.current?.send(JSON.stringify({ token }));
      initializePeerConnection(roleFromStorage, opponentData.id);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleSignalingData(message);
    };

    const handleConnectionLoss = () => {
      setConnectionStatus("⚠️ Signaling connection lost");
    };
    ws.current.onclose = handleConnectionLoss;
    ws.current.onerror = handleConnectionLoss;

    return () => {
      ws.current?.close();
      peerConnection.current?.close();
    };
  }, []);

  const initializePeerConnection = async (role: string, opponentId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnection.current = pc;
    setConnectionStatus("Creating P2P connection...");

    pc.onconnectionstatechange = () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }

      switch (pc.connectionState) {
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

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          event: "webrtc_ice_candidate",
          target: opponentId,
          data: event.candidate,
        });
      }
    };

    if (role === "offerer") {
      const dc = pc.createDataChannel("gameData");
      dataChannel.current = dc;
      setupDataChannelEvents(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ event: "webrtc_offer", target: opponentId, data: offer });
    } else {
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
          if (message.data && message.data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(message.data));
          }
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
        break;
    }
  };

  const setupDataChannelEvents = (dc: RTCDataChannel) => {
    dc.onopen = () => {
      setConnectionStatus("✅ Data Channel Open");
      const roleLocal = localStorage.getItem("role");
      if (roleLocal === "offerer") {
        fetchAndShareQuestion();
        const start = Date.now();
        setMatchStartTime(start);
        const sid = localStorage.getItem("session_id");
        setSessionId(sid);
        try {
          dc.send(JSON.stringify({ event: 'match_start', payload: { startTime: start, sessionid: sid } }));
        } catch { }
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
        setQuestion(data.payload as Question);
        setCode((data.payload as Question).initial_code ?? {});
      } else if (data.event === 'give_up') {
        setConnectionStatus('Opponent left the match. Returning to matchmaking...');
        try { dataChannel.current?.close(); } catch { }
        try { peerConnection.current?.close(); } catch { }
        try { ws.current?.close(); } catch { }
        setTimeout(() => router.push('/matchmaking'), 500);
      } else if (data.event === 'match_start') {
        const { startTime, sessionid } = data.payload || {};
        if (typeof startTime === 'number') setMatchStartTime(startTime);
        if (sessionid) setSessionId(sessionid);
      } else if (data.event === 'submit') {
        const payload = data.payload || {};
        appendTerminal(`🏁 Opponent submitted at ${payload.timeTakenMs} ms`, 'info');
        if (localStorage.getItem('role') === 'offerer' && !resultFinalizedRef.current) {
          decideWinnerFirstSubmit(payload);
        }
      } else if (data.event === 'match_result') {
        const { winner, loser, sessionid, winnerTimeMs, loserTimeMs } = data.payload || {};
        appendTerminal(`🏆 Match result: winner=${winner} (${winnerTimeMs} ms), loser=${loser} (${loserTimeMs} ms)`, 'success');
        finalizeAndExit();
      }
    };
  };

  const sendSignal = (data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  };

  const appendTerminal = (line: string, type: 'default' | 'success' | 'error' | 'info' = 'default') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTerminalLines((prev) => [...prev, `[${timestamp}] ${line}`]);
  };

  useEffect(() => {
    if (!matchStartTime) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - matchStartTime;
      const remain = Math.max(0, 60 * 60 * 1000 - elapsed);
      setRemainingMs(remain);
    }, 1000);
    return () => clearInterval(interval);
  }, [matchStartTime]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleGiveUp = () => {
    try {
      if (dataChannel.current?.readyState === 'open') {
        dataChannel.current.send(JSON.stringify({ event: 'give_up' }));
      }
    } catch { }

    try { dataChannel.current?.close(); } catch { }
    try { peerConnection.current?.close(); } catch { }
    try { ws.current?.close(); } catch { }

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    setConnectionStatus('You left the match.');
    router.push('/matchmaking');
  };

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

      dataChannel.current.send(JSON.stringify(message));
      setMessages((prevMessages) => [...prevMessages, message]);
    }
  };

  const decideWinnerFirstSubmit = async (submission: { userid: string; sessionid: string; timeTakenMs: number; }) => {
    if (resultFinalizedRef.current) return;
    resultFinalizedRef.current = true;
    const winner = submission.userid;
    const computedLoser = winner === currentUser?.userid ? (opponentId || '') : (currentUser?.userid || '');
    const winnerTimeMs = submission.timeTakenMs;
    const loserTimeMs = matchStartTime ? Date.now() - matchStartTime : winnerTimeMs + 1;

    appendTerminal(`🎯 Determined winner: ${winner} | loser: ${computedLoser}`, 'success');

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (base && sessionId) {
        await fetch(`${base}/users/elo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userid: winner, sessionid: sessionId, win: true }) });
        await fetch(`${base}/users/elo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userid: computedLoser, sessionid: sessionId, win: false }) });
      }
    } catch (e) {
      appendTerminal(`❌ ELO update failed: ${String(e)}`, 'error');
    }

    try {
      dataChannel.current?.send(JSON.stringify({ event: 'match_result', payload: { winner, loser: computedLoser, sessionid: sessionId, winnerTimeMs, loserTimeMs } }));
    } catch { }

    finalizeAndExit();
  };

  const finalizeAndExit = () => {
    try { dataChannel.current?.close(); } catch { }
    try { peerConnection.current?.close(); } catch { }
    try { ws.current?.close(); } catch { }
    setTimeout(() => router.push('/matchmaking'), 400);
  };

  const fetchAndShareQuestion = async () => {
    const sessionId = localStorage.getItem("session_id");
    if (!sessionId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/question?sessionid=${sessionId}`);
      const data = await response.json();

      if (data.success && data.question) {
        setQuestion(data.question);
        setCode((data.question as Question).initial_code ?? {});

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

  function update_code(value: string | undefined) {
    setCode(prev => ({
      ...prev,
      [language]: value ?? "",
    }));
  }

  async function run_tests(question: Question, amt: number | undefined = undefined) {
    setTerminalLines([]);
    appendTerminal(`🧪 Running tests for ${language}...`, 'info');
    let passed_count = 0;
    const compiler = get_compiler(language);
    const total_cases = amt ?? question.test_cases.length;

    for (let i = 0; i < total_cases; i++) {
      const test_case = question.test_cases[i];
      const inputs = test_case.inputs;
      const outputsExpected = test_case.outputs;
      const inputs_as_array = Array.isArray(inputs) ? inputs : Object.values(inputs ?? {});

      appendTerminal(`📝 Case ${i + 1}/${total_cases} - Inputs: ${JSON.stringify(inputs_as_array)}`, 'default');

      const result = await compiler.run(
        code[language],
        question.target_func,
        inputs_as_array
      );

      if (result.logs?.length) {
        result.logs.forEach((l) => appendTerminal(l, 'default'));
      }

      const pass = JSON.stringify(result.output) === JSON.stringify(outputsExpected);
      appendTerminal(
        pass
          ? `✅ Passed | Output: ${JSON.stringify(result.output)}`
          : `❌ Failed | Expected: ${JSON.stringify(outputsExpected)} | Got: ${JSON.stringify(result.output)}`,
        pass ? 'success' : 'error'
      );
      if (pass) passed_count++;
    }

    appendTerminal(`📊 Results: Passed ${passed_count}/${total_cases}`, passed_count === total_cases ? 'success' : 'error');
    return { passed_count, total_cases };
  }

  async function on_submit_code() {
    if (!question) return;
    try {
      appendTerminal(`🚀 Submitting solution...`, 'info');
      const res = await run_tests(question);
      if (res.passed_count < res.total_cases) {
        appendTerminal(`⚠️ Not all tests passed. Fix your solution before submitting.`, 'error');
        return;
      }
    } catch (e) {
      appendTerminal(`❌ Test run failed: ${String(e)}`, 'error');
      return;
    }

    if (!currentUser || !matchStartTime || !sessionId) return;
    const timeTakenMs = Date.now() - matchStartTime;
    const payload = { userid: currentUser.userid, sessionid: sessionId, timeTakenMs };
    appendTerminal(`✅ You submitted at ${timeTakenMs} ms`, 'success');
    try { dataChannel.current?.send(JSON.stringify({ event: 'submit', payload })); } catch { }
    if (role === 'offerer' && !resultFinalizedRef.current) {
      decideWinnerFirstSubmit(payload);
    }
  }

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 0:
        return 'text-green-600 bg-green-50';
      case 1:
        return 'text-yellow-600 bg-yellow-50';
      case 2:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConnectionStatusColor = () => {
    if (connectionStatus.includes('✅')) return 'text-green-600';
    if (connectionStatus.includes('⚠️')) return 'text-yellow-600';
    if (connectionStatus.includes('❌')) return 'text-red-600';
    if (connectionStatus.includes('⏳')) return 'text-blue-600';
    return 'text-gray-600';
  };

  const difficulties : Record<number, string> = {
    0: "easy",
    1: "medium",
    2: "hard"
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b shadow-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Code className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Tp2</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className={`font-medium ${getConnectionStatusColor()}`}>
                {connectionStatus}
              </span>
              {question && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                  {difficulties[question.difficulty]}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg font-medium">
                {formatTime(remainingMs)}
              </span>
            </div>
            <Button variant="outline" onClick={handleGiveUp} className="border-red-300 text-red-600 hover:bg-red-50">
              <Flag className="w-4 h-4 mr-2" />
              Give Up
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel: Problem Description */}
          <Panel defaultSize={25} minSize={20} maxSize={35}>
            <Card className="h-full border-0 rounded-none shadow-none">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-blue-600" />
                  {question ? question.title : "Loading Problem..."}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 overflow-y-auto bg-gray-50">
                {question ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                      <p className="text-gray-600 leading-relaxed">{question.prompt}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Example Test Cases</h3>
                      <div className="space-y-3">
                        {question.test_cases.slice(0, 2).map((testCase, index) => (
                          <Card key={index} className="border-gray-200">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div>
                                  <span className="text-xs font-medium text-gray-500">Input:</span>
                                  <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                    <code>{JSON.stringify(testCase.inputs)}</code>
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-gray-500">Expected Output:</span>
                                  <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                    <code>{JSON.stringify(testCase.outputs)}</code>
                                  </pre>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Zap className="w-8 h-8 animate-pulse" />
                  </div>
                )}
              </CardContent>
            </Card>
          </Panel>

          <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors" />

          {/* Center Panel: Editor + Terminal */}
          <Panel defaultSize={50} className="flex flex-col">
            {/* Editor Controls */}
            <div className="bg-white border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!question) return;
                      try {
                        const res = await run_tests(question, 2);
                      } catch (e) {
                        appendTerminal(`❌ Test run failed: ${String(e)}`, 'error');
                      }
                    }}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Run Tests
                  </Button>
                  <Button
                    size="sm"
                    onClick={on_submit_code}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Solution
                  </Button>
                </div>
              </div>
            </div>

            {/* Editor + Terminal Split */}
            <PanelGroup direction="vertical" className="flex-1">
              <Panel defaultSize={70} minSize={30}>
                <div className="h-full">
                  <Editor
                    height="100%"
                    language={language}
                    theme="vs"
                    value={code[language]}
                    onChange={(value) => update_code(value)}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-gray-200 hover:bg-blue-400 transition-colors" />

              <Panel defaultSize={30} minSize={20}>
                <Card className="h-full border-0 rounded-none shadow-none">
                  <CardHeader className="px-4">
                    <CardTitle className="text-sm flex items-center gap-2 text-gray-300">
                      <Terminal className="w-4 h-4" />
                      Terminal Output
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-3rem)] overflow-y-auto">
                    <div className="p-4 font-mono text-xs leading-relaxed">
                      {terminalLines.length === 0 ? (
                        <div className="text-gray-500">Ready to execute your code...</div>
                      ) : (
                        terminalLines.map((line, idx) => {
                          let textColor = 'text-gray-300';
                          if (line.includes('✅')) textColor = 'text-green-400';
                          else if (line.includes('❌')) textColor = 'text-red-400';
                          else if (line.includes('⚠️')) textColor = 'text-yellow-400';
                          else if (line.includes('🧪') || line.includes('🚀')) textColor = 'text-blue-400';
                          else if (line.includes('🏆') || line.includes('🎯')) textColor = 'text-purple-400';
                          
                          return (
                            <div key={idx} className={`${textColor} mb-1`}>
                              {line}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors" />

          {/* Right Panel: Chat */}
          <Panel defaultSize={25} minSize={20} maxSize={35}>
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}