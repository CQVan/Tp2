"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [useLogin, setUseLogin] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        window.location.href = "/matchmaking";
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{useLogin ? "Login" : "Register"}</CardTitle>
        </CardHeader>
        <CardContent>
          {useLogin ? <LoginForm /> : <RegisterForm />}
          <Button
            variant="link"
            className="mt-4 w-full"
            onClick={() => setUseLogin(!useLogin)}
          >
            {useLogin ? "Create account" : "Already have an account?"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const userid = formData.get("userid") as string;
    const password = formData.get("password") as string;

    if (!userid || !password) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || `Error: ${res.statusText}`);
        return;
      }
      
      const data = await res.json();

      if (data.success && data.token) {
        setSuccess("Login successful! Redirecting...");

        // Store the JWT in localStorage
        localStorage.setItem("authToken", data.token);

        // Redirect to the matchmaking page after a short delay
        setTimeout(() => {
          window.location.href = '/matchmaking';
        }, 1000);

      } else {
        setError(data.error || "Login failed. No token received.");
      }
    } catch (e) {
      setError("Could not connect to the server.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="userid">Username</Label>
        <Input id="userid" name="userid" type="text" autoComplete="username" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full">
        Login
      </Button>
    </form>
  );
}

function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const userid = formData.get("userid") as string;
    const password = formData.get("password") as string;
    const password_confirm = formData.get("password_confirm") as string;

    if (!userid || !password || !password_confirm) {
      setError("Please fill all fields.");
      return;
    }
    if (password !== password_confirm) {
      setError("Passwords do not match.");
      return;
    }

    //password length
    if (password.length <= 7){
    setError("Password too short should be more than 7 charactor")
    return;
    }
    //password capital letter
    if (!/[A-Z]/.test(password)) {
      setError("Password must include at least one uppercase letter.");
      return;
    }
    //password must have an special charactor
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError("Password must include at least one special character.");
      return;
    }
    //password must have number
    if (!/\d/.test(password)) {
      setError("Password must include at least one number.");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid, password }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || `Error: ${res.statusText}`);
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setSuccess("Registration successful! You can now log in.");
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (e) {
      setError("Could not connect to server.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="userid">Username</Label>
        <Input id="userid" name="userid" type="text" autoComplete="username" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </div>
      <div>
        <Label htmlFor="password_confirm">Confirm Password</Label>
        <Input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" />
      </div>
      <Button type="submit" className="w-full">
        Register
      </Button>
    </form>
  );
}

