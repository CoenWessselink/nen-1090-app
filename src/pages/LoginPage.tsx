import React, { useState } from "react";
import apiClient from "@/services/apiClient";
import { useSession } from "@/app/session/SessionContext";

export default function LoginPage() {
  const { setSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await apiClient.post("/auth/login", {
      email,
      password,
    });

    const { token, user } = res.data;

    setSession(token, user);

    window.location.href = "/";
  };

  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
