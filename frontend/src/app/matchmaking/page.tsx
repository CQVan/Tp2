"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// A simple helper function to decode the JWT payload
function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
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

  useEffect(() => {
    // This effect runs once when the component mounts
    const token = localStorage.getItem("authToken");

    if (!token) {
      // If no token, redirect to login
      window.location.href = '/login';
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload || !payload.sub) {
      setError("Invalid auth token. Please log in again.");
      // Optional: clear bad token and redirect
      // localStorage.removeItem("authToken");
      // window.location.href = '/login';
      return;
    }

    // Use the userid from the token to fetch user data
    const fetchUserData = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/getUserById?userid=${payload.sub}`);
        if (!res.ok) {
          throw new Error("Failed to fetch user data.");
        }
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
  }, []); // Empty dependency array means this runs only once on mount

  function handleMatchmake() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
    }

    setIsQueueing(true);
    setStatus("Connecting to matchmaking...");
    const ws = new WebSocket("ws://127.0.0.1:8000/matchmaking");

    ws.onopen = () => {
      setStatus("In queue, waiting for opponent...");
      // Send the token for authentication
      ws.send(JSON.stringify({ token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "match_found") {
        setStatus("Match found! Redirecting...");
        localStorage.setItem("session_id", data.session_id);
        localStorage.setItem("opponent", JSON.stringify(data.opponent));
        ws.close();
        // Redirect to the match page (you'll need to create this page)
        window.location.href = `/match/${data.session_id}`;
      }
    };

    ws.onclose = (event) => {
      if (!event.wasClean) setStatus("Connection closed unexpectedly. Please try again.");
      setIsQueueing(false);
    };
    
    ws.onerror = () => {
      setStatus("Error connecting to matchmaking service.");
      setIsQueueing(false);
    };
  }

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8 flex flex-col items-center gap-8">
        <div className="w-full flex flex-col items-center gap-2">
          <div className="text-2xl font-bold">Hello, {user.userid}!</div>
          <div className="text-lg text-gray-600">Elo: <span className="font-mono">{user.elo}</span></div>
        </div>
        <Button
          className="w-full text-2xl py-8"
          disabled={isQueueing}
          onClick={handleMatchmake}
        >
          {isQueueing ? 'WAITING...' : 'MATCHMAKE'}
        </Button>
        <div className="w-full text-center text-gray-500 mt-4 min-h-[24px]">{status}</div>
      </Card>
    </div>
  );
}
