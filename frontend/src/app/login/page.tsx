"use client"; // Needed for client-side form handling

import React, { useState } from "react";

export default function Page(){
    const [useLogin, setUseLogin] = useState<boolean>(true);

    return(
        <div>
            {useLogin ? <Login /> : <Register/>}
            <button onClick={() => setUseLogin(!useLogin)}>{useLogin ? "Create account" : "Already have an account?"}</button>
        </div>
    )
}

export function Login() {
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Prevent page reload

    const formData = new FormData(event.currentTarget);
    const username = formData.get("id");
    const password = formData.get("password");

    console.log("Username:", username);
    console.log("Password:", password);

    // You can now send data to your API
    // await fetch("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });


  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="id">Username:</label>
      <br />
      <input type="text" id="id" name="id" />
      <br />
      <label htmlFor="password">Password:</label>
      <br />
      <input type="password" id="password" name="password" />
      <br />
      <input type="submit" value="Login" />
    </form>
  );
}

export function Register(){
    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Prevent page reload

    const formData = new FormData(event.currentTarget);
    const username = formData.get("id");
    const password = formData.get("password");
    const password_confirm = formData.get("password_confirm");

    if(password !== password){
        console.log("passwords not the same!");
    }

    console.log("Username:", username);
    console.log("Password:", password);

    // You can now send data to your API
    // await fetch("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });


  }

    return (
    <form onSubmit={onSubmit}>
      <label htmlFor="id">Username:</label>
      <br />
      <input type="text" id="id" name="id" />
      <br />
      <label htmlFor="password">Password:</label>
      <br />
      <input type="password" id="password" name="password" />
      <br />
      <label htmlFor="password_confirm">Confirm Password:</label>
      <br />
      <input type="password" id="password_confirm" name="password_confirm" />
      <br />
      <input type="submit" value="Register" />
    </form>
  );
}
