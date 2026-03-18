"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const redirect = params.get("redirect") || "/";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      await login(form);

      router.push(redirect);
    } catch {
      setError("Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "400px" }}>
      <h1>Iniciar sesión</h1>

      {/* EMAIL */}
      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      {/* PASSWORD */}
      <input
        type="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* LOGIN */}
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          marginTop: "20px",
          padding: "12px",
          background: "black",
          color: "white",
          width: "100%",
        }}
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
      {/* REGISTER */}
      <p style={{ marginTop: "20px", textAlign: "center" }}>
        ¿No tenés cuenta?{" "}
        <span
          onClick={() => router.push("/register")}
          style={{ cursor: "pointer", textDecoration: "underline" }}
        >
          Crear cuenta
        </span>
      </p>
    </div>
  );
}
