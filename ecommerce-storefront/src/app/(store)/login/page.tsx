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
    <section
      style={{
        padding: "72px 20px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), #0b0b0b",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 28,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            minHeight: 620,
            padding: 32,
            borderRadius: 36,
            background:
              "linear-gradient(150deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            alignContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 14px",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                fontSize: 12,
                color: "rgba(247,241,232,0.56)",
              }}
            >
              Asphalt members
            </p>
            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
                lineHeight: 0.95,
                margin: "0 0 18px",
                textTransform: "uppercase",
                letterSpacing: "-0.06em",
              }}
            >
              Volvé a tu cuenta
            </h1>
            <p style={{ maxWidth: 460, color: "rgba(247,241,232,0.68)", lineHeight: 1.8 }}>
              Ingresá para revisar tus direcciones, completar tu compra y seguir el
              próximo drop urbano.
            </p>
          </div>

          <div
            style={{
              minHeight: 260,
              padding: 24,
              borderRadius: 28,
              border: "1px dashed rgba(255,255,255,0.16)",
              color: "rgba(247,241,232,0.66)",
              display: "grid",
              alignContent: "end",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            }}
          >
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 11,
                color: "rgba(247,241,232,0.42)",
              }}
            >
              Access panel
            </p>
            <strong style={{ marginTop: 10, fontSize: 24 }}>Minimal streetwear account</strong>
            <p style={{ margin: "10px 0 0", lineHeight: 1.8 }}>
              Un acceso simple, oscuro y editorial para mantener el mismo tono que
              el resto del storefront.
            </p>
          </div>
        </div>

        <div
          style={{
            padding: 32,
            borderRadius: 36,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 style={{ margin: "0 0 24px", fontSize: 28, textTransform: "uppercase" }}>
            Iniciar sesión
          </h2>

          <div style={{ display: "grid", gap: 14 }}>
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={fieldStyle}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={fieldStyle}
            />
          </div>

          {error ? <p style={{ color: "#ff8f8f", marginTop: 14 }}>{error}</p> : null}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              ...primaryButton,
              width: "100%",
              marginTop: 22,
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p style={{ marginTop: 20, color: "rgba(247,241,232,0.68)" }}>
            ¿No tenés cuenta?{" "}
            <span
              onClick={() => router.push("/register")}
              style={{
                cursor: "pointer",
                color: "white",
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              Crear cuenta
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  outline: "none",
};

const primaryButton: React.CSSProperties = {
  padding: "16px 20px",
  background: "white",
  color: "#111",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontWeight: 800,
};
