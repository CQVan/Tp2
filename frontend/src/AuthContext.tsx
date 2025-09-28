"use client";

import React, { createContext, useState, useContext, useEffect } from "react";

interface User {
  userid: string;
  elo: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userid: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect runs once when the app loads
    const token = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      setToken(token);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (userid: string, password: string) => {
    const res = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userid, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setToken(data.token);
      localStorage.setItem("access_token", data.token);
      // Fetch user details using the token (decode JWT or call /getUserById)
      const userRes = await fetch(`http://127.0.0.1:8000/getUserById?userid=${userid}`);
      const userData = await userRes.json();
      if (userData.success) {
        setUser({ userid: userData.userid, elo: userData.elo });
        localStorage.setItem("user", JSON.stringify({ userid: userData.userid, elo: userData.elo }));
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  const value = { user, token, login, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
