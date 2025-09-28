"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";


export default function MatchmakingPage() {
  const { user, token } = useAuth();
  const [elo, setElo] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("Click MATCHMAKE to enter the queue.");
  const [isQueueing, setIsQueueing] = useState(false);

  useEffect(() => {
    // Fetch user details using token if needed
    if (user && token && elo === null) {
      // Example: fetch user details endpoint if you have one
      // fetch("http://127.0.0.1:8000/users/me", { headers: { Authorization: `Bearer ${token}` } })
      //   .then(res => res.json())
      //   .then(data => setElo(data.elo));
      // For now, just setElo to a placeholder or from user
      setElo(user.elo || 1000);
    }
  }, [user, token, elo]);

  function handleMatchmake() {
    setIsQueueing(true);
    setStatus("Connecting to matchmaking...");
    const ws = new WebSocket("ws://127.0.0.1:8000/matchmaking");
    ws.onopen = () => {
      setStatus("In queue, waiting for opponent...");
      ws.send(JSON.stringify({ token }));
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "match_found") {
        setStatus("Match found! Redirecting...");
        // Save session info and redirect to match page
        localStorage.setItem("session_id", data.session_id);
        localStorage.setItem("opponent", JSON.stringify(data.opponent));
        ws.close();
        window.location.href = `/match/${data.session_id}`;
      }
    };
    ws.onclose = (event) => {
      if (!event.wasClean) setStatus("Connection closed unexpectedly.");
      setIsQueueing(false);
    };
    ws.onerror = () => {
      setStatus("Error connecting to matchmaking.");
      setIsQueueing(false);
    };
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-xl font-bold mb-4">Not logged in</div>
          <a href="/login">
            <Button>Go to Login</Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8 flex flex-col items-center gap-8">
        <div className="w-full flex flex-col items-center gap-2">
          <div className="text-2xl font-bold">Hello, {user.userid}!</div>
          <div className="text-lg text-gray-600">Elo: <span className="font-mono">{elo ?? "..."}</span></div>
        </div>
        <Button
          className="w-full text-2xl py-8"
          disabled={isQueueing}
          onClick={handleMatchmake}
        >
          MATCHMAKE
        </Button>
        <div className="w-full text-center text-gray-500 mt-4 min-h-[24px]">{status}</div>
      </Card>
    </div>
  );
}

