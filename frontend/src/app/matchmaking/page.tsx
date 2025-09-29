"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from 'next/navigation';

// No changes needed for decodeJwtPayload helper function

function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

export default function MatchmakingPage() {
  const [user, setUser] = useState<{ userid: string; elo: number } | null>(null);
  const [status, setStatus] = useState<string>("Click MATCHMAKE to enter the queue.");
  const [isQueueing, setIsQueueing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  // CHANGE: Use useRef to hold the WebSocket instance
  // This prevents it from being re-created on every render
  const ws = useRef<WebSocket | null>(null);
  const router = useRouter();
  // This effect for fetching user data is fine, no changes needed here.
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.href = '/login';
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.sub) {
      setError("Invalid auth token. Please log in again.");
      return;
    }
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users?userid=${payload.sub}`);
        if (!res.ok) throw new Error("Failed to fetch user data.");
        const data = await res.json();
        
        if (data.success) {
          setUser({ userid: data.userid, elo: data.elo });
        } else {
          setError(data.error || "Could not retrieve user details.");
        }
      } catch (e) {
        setError("Could not connect to the server to get user details.");
      }
    };
    fetchUserData();
  }, []);

  // Cleanup effect for the WebSocket connection
  useEffect(() => {
    // This function will be called when the component unmounts
    return () => {
      // Only close the WebSocket if we're not in a match
      const sessionId = localStorage.getItem("session_id");
      if (!sessionId && ws.current) {
        ws.current.close();
      }
    };
  }, []);

  function handleMatchmake() {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authentication token not found. Please log in again.");
      return;
    }

    setIsQueueing(true);
    setStatus("Connecting...");

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const wsUrl = process.env.NEXT_PUBLIC_WSS_URL;
    if (!wsUrl) {
      setError("WebSocket URL is not configured.");
      setIsQueueing(false);
      return;
    }

    if (!backendUrl) {
      setError("Backend URL is not configured.");
      setIsQueueing(false);
      return;
    }

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setStatus("In queue, waiting for an opponent...");
      // Send the token for authentication and to enter the queue
      ws.current?.send(JSON.stringify({ token }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "match_found") {
        // CHANGE: This is the new logic!
        // We do NOT redirect. We stay on this page to start the P2P handshake.
        setStatus(`✅ Match found against ${data.opponent.id}! Preparing the game...`);
        setIsQueueing(false); // We are no longer in the queue

        // Store opponent details for the next step
        localStorage.setItem("opponent", JSON.stringify(data.opponent));
        localStorage.setItem("role", data.role); // 'offerer' or 'answerer'
        localStorage.setItem("session_id", data.session_id);
        // Keep the WebSocket connection alive for signaling

        // Navigate to the match page while keeping the connection open
        router.push(`/match/${data.session_id}`);
        // --------------------------------------------------------------------
      }
    };

    ws.current.onclose = () => {
      setStatus("Disconnected from queue.");
      setIsQueueing(false);
    };

    ws.current.onerror = () => {
      setError("Could not connect to the matchmaking service.");
      setIsQueueing(false);
    };
  }

  function handleCancel() {
    if (ws.current) {
      ws.current.close(); // The onclose event will handle the state updates
    }
  }

  // No changes needed for the JSX rendering part below this line,
  // but we'll add the cancel button.

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-xl font-bold mb-4 text-red-600">Error</div>
          <p>{error}</p>
          <a href="/login">
            <Button className="mt-4">Go to Login</Button>
          </a>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-xl font-bold mb-4">Loading user data...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 relative">
      {/* Logout button in the top-right corner */}
      <button
        className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        onClick={() => {
          localStorage.removeItem("authToken");
          window.location.href = "/login";
        }}
      >
        Logout
      </button>
      <Card className="w-full max-w-md p-8 flex flex-col items-center gap-8">
        <div className="w-full flex flex-col items-center gap-2">
          <div className="text-2xl font-bold">Hello, {user.userid}!</div>
          <div className="text-lg text-gray-600">Elo: <span className="font-mono">{user.elo}</span></div>
        </div>
        {isQueueing ? (
          <Button
            className="w-full text-2xl py-8"
            variant="destructive"
            onClick={handleCancel}
          >
            CANCEL
          </Button>
        ) : (
          <Button
            className="w-full text-2xl py-8"
            onClick={handleMatchmake}
          >
            MATCHMAKE
          </Button>
        )}
        <div className="w-full text-center text-gray-500 mt-4 min-h-[24px]">{status}</div>
      </Card>
    </div>
  );
}