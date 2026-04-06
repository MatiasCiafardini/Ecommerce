"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/config";

type AuthUser = {
  id: number;
  email: string;
  role: string;
  name?: string | null;
};

type StoreSummary = {
  id: number;
  name: string;
  domain: string;
  createdAt: string;
  owner: {
    id: number;
    email: string;
    name?: string | null;
    role: string;
    createdAt: string;
  } | null;
  adminCount: number;
};

type LoginState = {
  email: string;
  password: string;
};

type StoreFormState = {
  name: string;
  domain: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerName: string;
};

const tokenStorageKey = "ecommerce-admin.token";

const initialLoginState: LoginState = {
  email: "",
  password: "",
};

const initialStoreFormState: StoreFormState = {
  name: "",
  domain: "",
  ownerEmail: "",
  ownerPassword: "",
  ownerName: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeErrorMessage(payload: unknown, fallback: string) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload
  ) {
    const message = (payload as { message?: string | string[] }).message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export default function AdminHomePage() {
  const apiUrl = getApiUrl();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loginState, setLoginState] = useState(initialLoginState);
  const [storeFormState, setStoreFormState] = useState(initialStoreFormState);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function fetchStores(activeToken: string) {
    const response = await fetch(`${apiUrl}/system/stores`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
      cache: "no-store",
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        normalizeErrorMessage(payload, "No se pudieron cargar las tiendas."),
      );
    }

    return (payload as StoreSummary[]) ?? [];
  }

  async function bootstrapSession(activeToken: string) {
    const response = await fetch(`${apiUrl}/system/auth/me`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
      cache: "no-store",
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        normalizeErrorMessage(payload, "La sesion del panel no es valida."),
      );
    }

    const [profile, nextStores] = await Promise.all([
      Promise.resolve(payload as AuthUser),
      fetchStores(activeToken),
    ]);

    setUser(profile);
    setStores(nextStores);
  }

  useEffect(() => {
    const savedToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem(tokenStorageKey)
        : null;

    if (!savedToken) {
      setIsLoadingSession(false);
      return;
    }

    setToken(savedToken);
    bootstrapSession(savedToken)
      .catch((error) => {
        window.localStorage.removeItem(tokenStorageKey);
        setToken(null);
        setUser(null);
        setStores([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "La sesion guardada ya no es valida.",
        );
      })
      .finally(() => {
        setIsLoadingSession(false);
      });
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmittingLogin(true);

    try {
      const response = await fetch(`${apiUrl}/system/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginState),
      });

      const payload = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(payload, "No se pudo iniciar sesion."),
        );
      }

      const accessToken = (payload as { access_token: string }).access_token;
      window.localStorage.setItem(tokenStorageKey, accessToken);
      setToken(accessToken);
      await bootstrapSession(accessToken);
      setSuccessMessage("Sesion iniciada. Ya podes gestionar todas las tiendas.");
      setLoginState(initialLoginState);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo iniciar sesion.",
      );
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handleCreateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setErrorMessage("Necesitas iniciar sesion como super admin.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmittingStore(true);

    try {
      const response = await fetch(`${apiUrl}/system/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(storeFormState),
      });

      const payload = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(payload, "No se pudo crear la tienda."),
        );
      }

      setStoreFormState(initialStoreFormState);
      setStores(await fetchStores(token));
      setSuccessMessage("La tienda se creo correctamente.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo crear la tienda.",
      );
    } finally {
      setIsSubmittingStore(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setStores([]);
    setSuccessMessage("Sesion cerrada.");
  }

  if (isLoadingSession) {
    return (
      <main style={shellStyle}>
        <section style={heroCardStyle}>
          <p style={eyebrowStyle}>EstudiosMC Control Room</p>
          <h1 style={headlineStyle}>Cargando el panel maestro...</h1>
        </section>
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <section style={heroCardStyle}>
        <div style={heroTopRowStyle}>
          <div>
            <p style={eyebrowStyle}>EstudiosMC Control Room</p>
            <h1 style={headlineStyle}>Panel maestro del ecosistema</h1>
            <p style={copyStyle}>
              Esta primera fase deja resuelto el acceso de super admin y la
              gestion centralizada de tiendas. Desde aca podes crear nuevas
              tiendas y auditar el estado general sin pasar por un storefront.
            </p>
          </div>
          {user ? (
            <div style={sessionBadgeStyle}>
              <span style={{ fontWeight: 700 }}>{user.name || user.email}</span>
              <span>{user.role}</span>
              <button onClick={logout} style={secondaryButtonStyle}>
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>

        {errorMessage ? <p style={errorBannerStyle}>{errorMessage}</p> : null}
        {successMessage ? (
          <p style={successBannerStyle}>{successMessage}</p>
        ) : null}
      </section>

      <section style={gridStyle}>
        {!user ? (
          <article style={panelStyle}>
            <p style={sectionLabelStyle}>Acceso</p>
            <h2 style={sectionTitleStyle}>Ingresar como super admin</h2>
            <form onSubmit={handleLogin} style={formStyle}>
              <label style={fieldStyle}>
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={loginState.email}
                  onChange={(event) =>
                    setLoginState((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </label>
              <label style={fieldStyle}>
                <span>Password</span>
                <input
                  required
                  type="password"
                  value={loginState.password}
                  onChange={(event) =>
                    setLoginState((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </label>
              <button
                type="submit"
                disabled={isSubmittingLogin}
                style={primaryButtonStyle}
              >
                {isSubmittingLogin ? "Ingresando..." : "Entrar al panel"}
              </button>
            </form>
          </article>
        ) : (
          <>
            <article style={panelStyle}>
              <p style={sectionLabelStyle}>Tiendas</p>
              <div style={panelHeaderStyle}>
                <h2 style={sectionTitleStyle}>Sistema operativo</h2>
                <span style={pillStyle}>{stores.length} activas</span>
              </div>
              <div style={storesListStyle}>
                {stores.map((store) => (
                  <article key={store.id} style={storeCardStyle}>
                    <div style={storeCardTopStyle}>
                      <div>
                        <h3 style={storeNameStyle}>{store.name}</h3>
                        <p style={domainStyle}>{store.domain}</p>
                      </div>
                      <span style={storeIdStyle}>#{store.id}</span>
                    </div>
                    <p style={metaStyle}>
                      Alta: {formatDate(store.createdAt)}
                    </p>
                    <p style={metaStyle}>
                      Owner:{" "}
                      {store.owner
                        ? `${store.owner.name || store.owner.email} (${store.owner.email})`
                        : "Sin owner"}
                    </p>
                    <p style={metaStyle}>
                      Admins registrados: {store.adminCount}
                    </p>
                  </article>
                ))}
              </div>
            </article>

            <article style={panelStyle}>
              <p style={sectionLabelStyle}>Alta nueva</p>
              <h2 style={sectionTitleStyle}>Crear tienda</h2>
              <form onSubmit={handleCreateStore} style={formStyle}>
                <label style={fieldStyle}>
                  <span>Nombre comercial</span>
                  <input
                    required
                    value={storeFormState.name}
                    onChange={(event) =>
                      setStoreFormState((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span>Dominio principal</span>
                  <input
                    required
                    placeholder="nueva-tienda.com"
                    value={storeFormState.domain}
                    onChange={(event) =>
                      setStoreFormState((current) => ({
                        ...current,
                        domain: event.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span>Email del owner</span>
                  <input
                    required
                    type="email"
                    value={storeFormState.ownerEmail}
                    onChange={(event) =>
                      setStoreFormState((current) => ({
                        ...current,
                        ownerEmail: event.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span>Password inicial</span>
                  <input
                    required
                    minLength={8}
                    type="password"
                    value={storeFormState.ownerPassword}
                    onChange={(event) =>
                      setStoreFormState((current) => ({
                        ...current,
                        ownerPassword: event.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
                <label style={fieldStyle}>
                  <span>Nombre del owner</span>
                  <input
                    value={storeFormState.ownerName}
                    onChange={(event) =>
                      setStoreFormState((current) => ({
                        ...current,
                        ownerName: event.target.value,
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSubmittingStore}
                  style={primaryButtonStyle}
                >
                  {isSubmittingStore ? "Creando..." : "Crear tienda"}
                </button>
              </form>
            </article>
          </>
        )}
      </section>
    </main>
  );
}

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "40px 24px 64px",
  display: "grid",
  gap: 24,
};

const heroCardStyle: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: 28,
  boxShadow: "var(--shadow)",
  padding: 32,
};

const heroTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--accent)",
  fontSize: 12,
};

const headlineStyle: CSSProperties = {
  margin: "12px 0 8px",
  fontSize: "clamp(2rem, 4vw, 3.6rem)",
  lineHeight: 1,
};

const copyStyle: CSSProperties = {
  margin: 0,
  maxWidth: 740,
  color: "var(--muted)",
  lineHeight: 1.6,
};

const sessionBadgeStyle: CSSProperties = {
  minWidth: 220,
  display: "grid",
  gap: 10,
  background: "var(--panel-strong)",
  border: "1px solid var(--line)",
  borderRadius: 20,
  padding: 16,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 24,
};

const panelStyle: CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "var(--shadow)",
};

const sectionLabelStyle: CSSProperties = {
  margin: 0,
  color: "var(--accent)",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sectionTitleStyle: CSSProperties = {
  margin: "10px 0 20px",
  fontSize: 28,
};

const panelHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#d9f3ee",
  color: "var(--accent-strong)",
  fontSize: 13,
  fontWeight: 700,
};

const formStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "var(--muted)",
  fontSize: 14,
};

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid var(--line)",
  padding: "14px 16px",
  background: "#fff",
  color: "var(--text)",
};

const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 16,
  padding: "14px 18px",
  background: "var(--accent)",
  color: "#f6fffd",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--line)",
  padding: "10px 14px",
  background: "#fff",
  cursor: "pointer",
};

const errorBannerStyle: CSSProperties = {
  marginTop: 20,
  marginBottom: 0,
  borderRadius: 16,
  background: "#fee4e2",
  color: "var(--danger)",
  padding: "14px 16px",
};

const successBannerStyle: CSSProperties = {
  marginTop: 20,
  marginBottom: 0,
  borderRadius: 16,
  background: "#dbf7f0",
  color: "var(--accent-strong)",
  padding: "14px 16px",
};

const storesListStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

const storeCardStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 20,
  padding: 18,
  background: "#fff",
};

const storeCardTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const storeNameStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
};

const domainStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "var(--muted)",
};

const storeIdStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--muted)",
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "6px 10px",
};

const metaStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "var(--muted)",
  lineHeight: 1.5,
};
