"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/context/auth-context";
import { getClientStoreId } from "@/lib/tenant/store-context";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { login, loginWithGoogle, lockAuthUi, unlockAuthUi } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const redirect = params.get("redirect") || "/";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);

  useEffect(() => {
    try {
      setShowGoogleAuth(getClientStoreId() !== 7);
    } catch {
      setShowGoogleAuth(false);
    }
  }, []);

  const redirectAfterLogin = (role?: string) => {
    const defaultRedirect =
      role && role !== "CUSTOMER"
        ? "/account?section=admin-overview"
        : "/account?section=orders";

    router.push(redirect === "/" ? defaultRedirect : redirect);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      lockAuthUi();

      const user = await login(form);
      redirectAfterLogin(user.role);
    } catch (error) {
      unlockAuthUi();
      setError(
        error instanceof Error && error.message.includes("Invalid credentials")
          ? "Email o contraseña incorrectos"
          : error instanceof Error
            ? error.message
            : "No se pudo iniciar sesión. Revisá la tienda abierta y probá nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        padding: "72px 20px",
        background: "transparent",
        color: "var(--text-strong)",
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
          className="comovosyyo-surface-card"
          style={{
            minHeight: 620,
            padding: 32,
            borderRadius: 36,
            background: "var(--page-panel-bg)",
            border: "1px solid var(--border-soft)",
            display: "grid",
            alignContent: "space-between",
          }}
        >
          <div>
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
            <p
              style={{
                maxWidth: 460,
                color: "var(--text-muted)",
                lineHeight: 1.8,
              }}
            >
              Ingresá para revisar tus direcciones, completar tu compra y seguir
              el próximo drop urbano.
            </p>
          </div>

          <div
            className="comovosyyo-surface-card comovosyyo-surface-card--quiet"
            style={{
              minHeight: 260,
              padding: 24,
              borderRadius: 28,
              border: "1px dashed var(--border-soft)",
              color: "var(--text-muted)",
              display: "grid",
              alignContent: "end",
              background: "var(--block-card-bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              Access panel
            </p>
            <p style={{ margin: "10px 0 0", lineHeight: 1.8 }}>
              Accede a tu perfil para revisar pedidos, direcciones y compras.
            </p>
          </div>
        </div>

        <div
          className="comovosyyo-surface-card"
          style={{
            padding: 32,
            borderRadius: 36,
            background: "var(--page-panel-bg)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <h2
            style={{
              margin: "0 0 24px",
              fontSize: 28,
              textTransform: "uppercase",
            }}
          >
            Iniciar sesión
          </h2>

          <div style={{ display: "grid", gap: 14 }}>
            {showGoogleAuth ? (
              <>
                <GoogleSignInButton
                  text="continue_with"
                  disabled={loading}
                  loginWithGoogle={loginWithGoogle}
                  onBusyChange={(busy) => {
                    setLoading(busy);

                    if (busy) {
                      lockAuthUi();
                      return;
                    }

                    unlockAuthUi();
                  }}
                  onError={(message) => {
                    unlockAuthUi();
                    setError(message);
                  }}
                  onSuccess={(user) => {
                    redirectAfterLogin(user.role);
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
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: "var(--border-soft)",
                    }}
                  />
                  o con email
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: "var(--border-soft)",
                    }}
                  />
                </div>
              </>
            ) : null}

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

          {error ? (
            <p style={{ color: "#d14f4f", marginTop: 14 }}>{error}</p>
          ) : null}

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

          <p style={{ marginTop: 20, color: "var(--text-muted)" }}>
            ¿No tenés cuenta?{" "}
            <span
              onClick={() => router.push("/register")}
              style={{
                cursor: "pointer",
                color: "var(--text-strong)",
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

function LoginLoadingState() {
  return (
    <section
      style={{
        padding: "72px 20px",
        background: "transparent",
      }}
    >
      <div
        className="comovosyyo-surface-card"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: 32,
          borderRadius: 36,
          background: "var(--page-panel-bg)",
          border: "1px solid var(--border-soft)",
          color: "var(--text-muted)",
        }}
      >
        Cargando acceso...
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "var(--block-card-bg)",
  color: "var(--text-strong)",
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
