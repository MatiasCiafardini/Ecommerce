"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "@/lib/config";

type AuthUser = { id: number; email: string; role: string; name?: string | null };
type HomeBlock = { type: string; props?: Record<string, unknown> };
type Store = {
  id: number;
  name: string;
  domain: string;
  createdAt: string;
  theme: string;
  owner: { id: number; email: string; name?: string | null; role: string } | null;
  adminCount: number;
  branding: { logoUrl: string | null; tagline: string | null; description: string | null };
  contact: { supportEmail: string | null; supportPhone: string | null };
  integrations: {
    mercadopago: {
      publicKeyConfigured: boolean;
      accessTokenConfigured: boolean;
      webhookSecretConfigured: boolean;
    };
    bankTransfer: {
      discountPercentage: number;
    };
  };
  features: {
    manualSalesEnabled: boolean;
  };
  provisioning: {
    panelReady: boolean;
    brandingReady: boolean;
    paymentsReady: boolean;
    storefrontReady: boolean;
    domainAutomationPending: boolean;
  };
  storefrontConfig: {
    theme?: string;
    themePalette?: Record<string, string>;
    pages?: { home?: HomeBlock[] };
  };
};

type LoginState = { email: string; password: string };
type StoreFormState = {
  name: string;
  domain: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerName: string;
  theme: string;
  tagline: string;
  description: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  heroTitle: string;
  heroSubtitle: string;
  accentColor: string;
  accentStrongColor: string;
  backgroundColor: string;
  panelColor: string;
  mercadoPagoPublicKey: string;
  mercadoPagoAccessToken: string;
  mercadoPagoWebhookSecret: string;
  manualSalesEnabled: boolean;
  bankTransferDiscountPercentage: string;
};

const localDeployCommand = `git add .\ngit commit -m "mensaje del cambio"\ngit push origin main`;
const vpsDeployCommand = `ssh mati@187.127.13.225\nbash /var/www/ecommerce/deploy.sh`;
const initialLoginState: LoginState = { email: "", password: "" };
const emptyStoreForm: StoreFormState = {
  name: "",
  domain: "",
  ownerEmail: "",
  ownerPassword: "",
  ownerName: "",
  theme: "minimal",
  tagline: "",
  description: "",
  logoUrl: "",
  supportEmail: "",
  supportPhone: "",
  heroTitle: "",
  heroSubtitle: "",
  accentColor: "#53b7c7",
  accentStrongColor: "#2f90a5",
  backgroundColor: "#06131a",
  panelColor: "#0d1f29",
  mercadoPagoPublicKey: "",
  mercadoPagoAccessToken: "",
  mercadoPagoWebhookSecret: "",
  manualSalesEnabled: false,
  bankTransferDiscountPercentage: "0",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function heroField(store: Store | null, key: "title" | "subtitle") {
  const hero = store?.storefrontConfig.pages?.home?.find((block) => block.type === "hero");
  const value = hero?.props?.[key];
  return typeof value === "string" ? value : "";
}

function storeToForm(store: Store | null): StoreFormState {
  if (!store) return emptyStoreForm;
  const palette = store.storefrontConfig.themePalette ?? {};
  return {
    name: store.name,
    domain: store.domain,
    ownerEmail: store.owner?.email ?? "",
    ownerPassword: "",
    ownerName: store.owner?.name ?? "",
    theme: store.theme ?? "minimal",
    tagline: store.branding.tagline ?? "",
    description: store.branding.description ?? "",
    logoUrl: store.branding.logoUrl ?? "",
    supportEmail: store.contact.supportEmail ?? "",
    supportPhone: store.contact.supportPhone ?? "",
    heroTitle: heroField(store, "title"),
    heroSubtitle: heroField(store, "subtitle"),
    accentColor: palette.accent ?? "#53b7c7",
    accentStrongColor: palette.accentStrong ?? "#2f90a5",
    backgroundColor: palette.background ?? "#06131a",
    panelColor: palette.pagePanelBg ?? "#0d1f29",
    mercadoPagoPublicKey: "",
    mercadoPagoAccessToken: "",
    mercadoPagoWebhookSecret: "",
    manualSalesEnabled: Boolean(store.features.manualSalesEnabled),
    bankTransferDiscountPercentage: String(
      Number(store.integrations.bankTransfer?.discountPercentage ?? 0),
    ),
  };
}

function serializeStoreForm(value: StoreFormState) {
  return {
    ...value,
    bankTransferDiscountPercentage: Number(value.bankTransferDiscountPercentage || 0),
  };
}

function StoreFields({
  value,
  onChange,
  saving,
  submitLabel,
  compact,
}: {
  value: StoreFormState;
  onChange: (patch: Partial<StoreFormState>) => void;
  saving: boolean;
  submitLabel: string;
  compact?: boolean;
}) {
  return (
    <div className={`form-grid${compact ? " compact" : ""}`}>
      {[
        ["Nombre comercial", "name"],
        ["Dominio principal", "domain"],
        ["Owner email", "ownerEmail"],
        ["Owner nombre", "ownerName"],
        ["Theme", "theme"],
        ["Tagline", "tagline"],
        ["Logo URL", "logoUrl"],
        ["Soporte email", "supportEmail"],
        ["Soporte telefono", "supportPhone"],
        ["Hero title", "heroTitle"],
        ["Hero subtitle", "heroSubtitle"],
        ["Accent", "accentColor"],
        ["Accent strong", "accentStrongColor"],
        ["Background", "backgroundColor"],
        ["Panel bg", "panelColor"],
        ["MP public key", "mercadoPagoPublicKey"],
        ["MP access token", "mercadoPagoAccessToken"],
        ["MP webhook secret", "mercadoPagoWebhookSecret"],
        ["Desc. transferencia %", "bankTransferDiscountPercentage"],
      ].map(([label, key]) => (
        <label key={key} className={`field${key === "tagline" || key === "logoUrl" || key === "heroSubtitle" || key === "mercadoPagoWebhookSecret" ? " span-2" : ""}`}>
          <span>{label}</span>
          <input
            value={value[key as keyof StoreFormState] as string}
            onChange={(event) => onChange({ [key]: event.target.value } as Partial<StoreFormState>)}
            type={key.toLowerCase().includes("email") ? "email" : "text"}
          />
        </label>
      ))}

      <label className="field span-2">
        <span>Venta manual</span>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={value.manualSalesEnabled}
            onChange={(event) => onChange({ manualSalesEnabled: event.target.checked })}
          />
          <span>{value.manualSalesEnabled ? "Habilitada" : "Deshabilitada"}</span>
        </label>
      </label>
      <label className="field span-2">
        <span>{compact ? "Password owner nueva" : "Password owner"}</span>
        <input
          type="password"
          value={value.ownerPassword}
          onChange={(event) => onChange({ ownerPassword: event.target.value })}
          placeholder={compact ? "Opcional" : "Minimo 8 caracteres"}
        />
      </label>
      <label className="field span-2">
        <span>Descripcion</span>
        <textarea
          rows={4}
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
      <button className="primary-button span-2" disabled={saving}>
        {saving ? "Guardando..." : submitLabel}
      </button>
    </div>
  );
}

export default function Page() {
  const apiUrl = getApiUrl();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loginState, setLoginState] = useState(initialLoginState);
  const [createState, setCreateState] = useState(emptyStoreForm);
  const [editState, setEditState] = useState(emptyStoreForm);
  const [tab, setTab] = useState<"overview" | "stores" | "create">("overview");
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingStore, setLoadingStore] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function copyCommandBlock(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setSuccessMessage(`${label} copiado al portapapeles.`);
    } catch {
      setErrorMessage(`No se pudo copiar ${label.toLowerCase()}.`);
    }
  }

  async function request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(readError(payload, "No se pudo completar la solicitud."));
    return payload as T;
  }

  async function loadStores() {
    return request<Store[]>("/system/stores", {
      cache: "no-store",
    });
  }

  async function loadStore(id: number) {
    return request<Store>(`/system/stores/${id}`, {
      cache: "no-store",
    });
  }

  async function bootstrap() {
    const profile = await request<AuthUser>("/system/auth/me", {
      cache: "no-store",
    });
    const nextStores = await loadStores();
    setUser(profile);
    setStores(nextStores);
    const firstId = nextStores[0]?.id ?? null;
    setSelectedStoreId(firstId);
    if (firstId) {
      const detail = await loadStore(firstId);
      setSelectedStore(detail);
      setEditState(storeToForm(detail));
    }
  }

  async function refresh(preferredId?: number | null) {
    const nextStores = await loadStores();
    setStores(nextStores);
    const nextId = preferredId && nextStores.some((store) => store.id === preferredId) ? preferredId : nextStores[0]?.id ?? null;
    setSelectedStoreId(nextId);
    if (nextId) {
      const detail = await loadStore(nextId);
      setSelectedStore(detail);
      setEditState(storeToForm(detail));
    }
  }

  useEffect(() => {
    bootstrap().catch((error) => {
      setUser(null);
      setStores([]);
      setSelectedStore(null);
      setSelectedStoreId(null);
      if (error instanceof Error && /401|403/.test(error.message)) {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "La sesion no es valida.");
    }).finally(() => setLoadingSession(false));
  }, []);

  useEffect(() => {
    if (!user || !selectedStoreId) return;
    setLoadingStore(true);
    loadStore(selectedStoreId).then((store) => {
      setSelectedStore(store);
      setEditState(storeToForm(store));
    }).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la tienda.");
    }).finally(() => setLoadingStore(false));
  }, [selectedStoreId, user]);

  const stats = useMemo(() => ([
    { label: "Tiendas activas", value: stores.length, detail: "Portfolio actual" },
    { label: "Branding listo", value: stores.filter((store) => store.provisioning.brandingReady).length, detail: "Logo y mensaje base" },
    { label: "Pagos listos", value: stores.filter((store) => store.provisioning.paymentsReady).length, detail: "Mercado Pago cargado" },
    { label: "Venta manual", value: stores.filter((store) => store.features.manualSalesEnabled).length, detail: "Tiendas con venta manual activa" },
  ]), [stores]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingLogin(true);
    try {
      await request<{ user: AuthUser }>("/system/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginState),
      });
      await bootstrap();
      setSuccessMessage("Sesion iniciada. El panel maestro ya esta operativo.");
      setLoginState(initialLoginState);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    } finally {
      setSavingLogin(false);
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingCreate(true);
    try {
      const created = await request<Store>("/system/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeStoreForm(createState)),
      });
      setCreateState(emptyStoreForm);
      setTab("stores");
      await refresh(created.id);
      setSuccessMessage(`La tienda ${created.name} ya quedo creada con owner y configuracion inicial.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo crear la tienda.");
    } finally {
      setSavingCreate(false);
    }
  }

  async function onSaveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selectedStoreId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingEdit(true);
    try {
      await request<Store>(`/system/stores/${selectedStoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeStoreForm(editState)),
      });
      await refresh(selectedStoreId);
      setSuccessMessage("La tienda se actualizo correctamente.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la tienda.");
    } finally {
      setSavingEdit(false);
    }
  }

  function logout() {
    void request("/system/auth/logout", {
      method: "POST",
    }).catch(() => null);
    setUser(null);
    setStores([]);
    setSelectedStore(null);
    setSelectedStoreId(null);
    setSuccessMessage("Sesion cerrada.");
  }

  if (loadingSession) return <main className="admin-shell"><section className="hero-panel"><p className="eyebrow">EstudiosMC Control Room</p><h1>Cargando el centro de operaciones...</h1></section></main>;

  return (
    <main className="admin-shell">
      <section className="hero-panel">
        <div className="hero-head">
          <div>
            <p className="eyebrow">EstudiosMC Control Room</p>
            <h1>Panel maestro del ecosistema</h1>
            <p className="hero-copy">Tema minimal oscuro, alta de tiendas, branding, owner, integraciones y dominio principal desde un solo panel. La automatizacion completa de DNS y Nginx sigue siendo una fase siguiente.</p>
          </div>
          {user ? <div className="session-box"><strong>{user.name || user.email}</strong><span>{user.role}</span><button className="ghost-button" onClick={logout}>Cerrar sesion</button></div> : null}
        </div>
        {errorMessage ? <p className="banner error">{errorMessage}</p> : null}
        {successMessage ? <p className="banner success">{successMessage}</p> : null}
      </section>

      {!user ? (
        <section className="panel single-panel">
          <p className="section-kicker">Acceso</p>
          <h2>Ingresar como super admin</h2>
          <form className="stack-form" onSubmit={onLogin}>
            <label className="field"><span>Email</span><input type="email" value={loginState.email} onChange={(event) => setLoginState((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label className="field"><span>Password</span><input type="password" value={loginState.password} onChange={(event) => setLoginState((current) => ({ ...current, password: event.target.value }))} required /></label>
            <button className="primary-button" disabled={savingLogin}>{savingLogin ? "Ingresando..." : "Entrar al panel"}</button>
          </form>
        </section>
      ) : (
        <section className="workspace">
          <aside className="sidebar">
            {["overview", "stores", "create"].map((item) => (
              <button key={item} className={`nav-button${tab === item ? " active" : ""}`} onClick={() => setTab(item as "overview" | "stores" | "create")}>
                <span>{item === "overview" ? "Overview" : item === "stores" ? "Tiendas" : "Nueva tienda"}</span>
                <small>{item === "overview" ? "Estado general" : item === "stores" ? "Editar y auditar" : "Lanzamiento guiado"}</small>
              </button>
            ))}
          </aside>

          <div className="content">
            <section className="stats-grid">
              {stats.map((stat) => <article key={stat.label} className="stat-card"><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small></article>)}
            </section>

            {tab === "overview" ? (
              <section className="content-grid">
                <article className="panel">
                  <p className="section-kicker">Checklist</p>
                  <h2>Lo que ya resuelve este panel</h2>
                  <div className="check-grid">
                    <div className="check-card"><strong>Alta de tienda</strong><span>Store, owner y base visual inicial.</span></div>
                    <div className="check-card"><strong>Branding</strong><span>Logo, tagline, descripcion y hero.</span></div>
                    <div className="check-card"><strong>Integraciones</strong><span>Credenciales por tienda para Mercado Pago.</span></div>
                    <div className="check-card"><strong>Operacion</strong><span>Edicion continua desde una sola consola.</span></div>
                  </div>
                </article>
                <article className="panel">
                  <p className="section-kicker">Recientes</p>
                  <h2>Tiendas activas</h2>
                  <div className="store-list">
                    {stores.slice(0, 5).map((store) => <button key={store.id} className="store-row" onClick={() => { setTab("stores"); setSelectedStoreId(store.id); }}><div><strong>{store.name}</strong><span>{store.domain}</span></div><small>{formatDate(store.createdAt)}</small></button>)}
                  </div>
                </article>
                <article className="panel command-panel">
                  <div className="panel-top">
                    <div>
                      <p className="section-kicker">Comandos rápidos</p>
                      <h2>Flujo de deploy</h2>
                    </div>
                  </div>
                  <div className="command-grid">
                    <div className="command-card">
                      <div className="command-head">
                        <div>
                          <strong>Local</strong>
                          <span>Subir cambios a GitHub</span>
                        </div>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => void copyCommandBlock(localDeployCommand, "Comando local")}
                        >
                          Copiar
                        </button>
                      </div>
                      <pre className="command-code">{localDeployCommand}</pre>
                    </div>
                    <div className="command-card">
                      <div className="command-head">
                        <div>
                          <strong>VPS</strong>
                          <span>Entrar y ejecutar deploy</span>
                        </div>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => void copyCommandBlock(vpsDeployCommand, "Comando VPS")}
                        >
                          Copiar
                        </button>
                      </div>
                      <pre className="command-code">{vpsDeployCommand}</pre>
                    </div>
                  </div>
                </article>
              </section>
            ) : null}

            {tab === "stores" ? (
              <section className="stores-grid">
                <article className="panel">
                  <div className="panel-top"><div><p className="section-kicker">Portfolio</p><h2>Tiendas</h2></div><span className="pill">{stores.length} activas</span></div>
                  <div className="store-list">
                    {stores.map((store) => <button key={store.id} className={`store-row${selectedStoreId === store.id ? " selected" : ""}`} onClick={() => setSelectedStoreId(store.id)}><div><strong>{store.name}</strong><span>{store.domain}</span></div><small>#{store.id}</small></button>)}
                  </div>
                </article>
                <article className="panel">
                  <div className="panel-top">
                    <div><p className="section-kicker">Editor</p><h2>{selectedStore?.name ?? "Selecciona una tienda"}</h2></div>
                    {selectedStore ? <span className="pill">{selectedStore.domain}</span> : null}
                  </div>
                  {selectedStore ? (
                    <>
                      <div className="status-row">
                        <span className={selectedStore.provisioning.brandingReady ? "status ok" : "status warn"}>Branding</span>
                        <span className={selectedStore.provisioning.paymentsReady ? "status ok" : "status warn"}>Pagos</span>
                        <span className="status neutral">Dominio externo manual</span>
                      </div>
                      {loadingStore ? <p className="muted">Cargando configuracion...</p> : <form className="stack-form" onSubmit={onSaveStore}><StoreFields value={editState} onChange={(patch) => setEditState((current) => ({ ...current, ...patch }))} saving={savingEdit} submitLabel="Guardar cambios" compact /></form>}
                    </>
                  ) : <p className="muted">Elegi una tienda para editar branding, owner, dominio e integraciones.</p>}
                </article>
              </section>
            ) : null}

            {tab === "create" ? (
              <section className="content-grid">
                <article className="panel">
                  <p className="section-kicker">Lanzamiento</p>
                  <h2>Crear tienda desde cero</h2>
                  <form className="stack-form" onSubmit={onCreate}>
                    <StoreFields value={createState} onChange={(patch) => setCreateState((current) => ({ ...current, ...patch }))} saving={savingCreate} submitLabel="Crear tienda" />
                  </form>
                </article>
                <article className="panel">
                  <p className="section-kicker">Alcance actual</p>
                  <h2>Sin tocar VPS, en lo posible</h2>
                  <div className="check-grid vertical">
                    <div className="check-card"><strong>Automatico hoy</strong><span>Tienda, owner, branding base, hero y pagos por tienda.</span></div>
                    <div className="check-card"><strong>Parcial</strong><span>Dominio principal guardado y listo para enlazar.</span></div>
                    <div className="check-card"><strong>Pendiente</strong><span>DNS, SSL y Nginx siguen fuera del panel por ahora.</span></div>
                  </div>
                </article>
              </section>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}
