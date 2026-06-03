"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { getClientStoreId } from "@/lib/tenant/store-context";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Error al crear cuenta";
};

export default function RegisterPage() {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  useEffect(() => {
    try {
      setShowGoogleAuth(getClientStoreId() !== 7);
    } catch {
      setShowGoogleAuth(false);
    }
  }, []);

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await api("/auth/customer/register", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      router.push("/login");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        padding: "72px 20px",
        background: "var(--page-shell-bg)",
        color: "var(--text-strong)",
      }}
    >
      <div
        className="comovosyyo-surface-card"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: 32,
          borderRadius: 36,
          background: "var(--page-panel-bg)",
          border: "1px solid var(--border-soft)",
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          New member
        </p>
        <h1
          style={{
            fontSize: "clamp(2.4rem, 5vw, 4.5rem)",
            lineHeight: 0.95,
            margin: "0 0 16px",
            textTransform: "uppercase",
            letterSpacing: "-0.06em",
          }}
        >
          Crear cuenta
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            maxWidth: 520,
            lineHeight: 1.8,
            marginBottom: 24,
          }}
        >
          Guarda tus direcciones, acelera el checkout y seguí tus próximos pedidos
          desde una cuenta más completa.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {showGoogleAuth ? (
            <>
              <GoogleSignInButton
                text="signup_with"
                disabled={loading}
                loginWithGoogle={loginWithGoogle}
                onBusyChange={setLoading}
                onError={setError}
                onSuccess={(user) => {
                  router.push(
                    user.role && ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role)
                      ? "/account?section=admin-overview"
                      : "/account?section=orders",
                  );
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                }}
              >
                <span style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
                o crea tu cuenta con email
                <span style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
              </div>
            </>
          ) : null}

          <div className="layout-form-two">
            <input
              placeholder="Nombre"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              style={fieldStyle}
            />

            <input
              placeholder="Apellido"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              style={fieldStyle}
            />
          </div>

          <div className="layout-form-two">
            <input
              placeholder="Telefono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={fieldStyle}
            />

            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={fieldStyle}
            />
          </div>

          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={fieldStyle}
          />

          <input
            type="password"
            placeholder="Repetir contraseña"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            style={fieldStyle}
          />
        </div>

        {error ? <p style={{ color: "#d14f4f", marginTop: 14 }}>{error}</p> : null}

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{ ...primaryButton, width: "100%", marginTop: 22 }}
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "var(--muted-field-bg)",
  color: "var(--muted-field-color)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  outline: "none",
};

const primaryButton: React.CSSProperties = {
  padding: "16px 20px",
  background: "var(--text-strong)",
  color: "var(--page-panel-bg)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontWeight: 800,
};
