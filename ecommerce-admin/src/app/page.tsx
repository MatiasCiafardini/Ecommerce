"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "@/lib/config";

type AuthUser = { id: number; email: string; role: string; name?: string | null };
type HomeBlock = { type: string; props?: Record<string, unknown> };
type ProvisioningPlan = {
  automationEnabled: boolean;
  storeId: number;
  domain: string;
  wwwDomain: string;
  proxyTarget: string;
  files: {
    storefrontEnvPath: string | null;
    backendEnvPath: string | null;
    nginxSitePath: string | null;
    deployScriptPath: string | null;
  };
  entries: {
    hostMap: string[];
    corsOrigins: string[];
  };
  nginx: {
    httpOnlyBlock: string;
    managedBlock: string;
  };
  commands: string[];
  notes: string[];
};
type ProvisioningRunResult = {
  ok: boolean;
  executedAt: string;
  steps: string[];
  plan: ProvisioningPlan;
};
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
    vpsAutomationReady?: boolean;
    domainAutomationPending: boolean;
  };
  storefrontConfig: {
    theme?: string;
    themePalette?: Record<string, string>;
    pages?: { home?: HomeBlock[] };
  };
};

type LoginState = { email: string; password: string };
type ThemeOption = {
  id: string;
  label: string;
  description: string;
  tone: string;
  surfaces: {
    background: string;
    panel: string;
    accent: string;
    text: string;
  };
};
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
const vpsIpAddress = "187.127.13.225";
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
const createSteps = [
  { id: "identity", label: "Datos base", detail: "Nombre, dominio, owner y theme base" },
  { id: "experience", label: "Experiencia", detail: "Branding inicial e integraciones base" },
  { id: "external", label: "Tareas externas", detail: "DNS, Cloudflare y Hostinger" },
  { id: "review", label: "Revision", detail: "Checklist final y creacion" },
] as const;

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

function createSlugCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withWww(domain: string) {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return "";
  return normalized.startsWith("www.") ? normalized : `www.${normalized}`;
}

function buildProvisioningChecklist(domain: string) {
  const wwwDomain = withWww(domain);
  return [
    {
      title: "Cloudflare DNS",
      description: "Crear o editar los registros A para el dominio principal y www.",
      commands: [
        `A @ -> ${vpsIpAddress}`,
        `A www -> ${vpsIpAddress}`,
        `Proxy status: Proxied`,
      ],
    },
    {
      title: "Cloudflare SSL/TLS",
      description: "Verificar que el modo quede en Full (strict) para evitar loops y errores de certificado.",
      commands: [
        "Cloudflare > SSL/TLS > Overview",
        "Seleccionar Full (strict)",
        "Nunca dejar Flexible",
      ],
    },
    {
      title: "Hostinger / registrador",
      description: "Si el dominio se administra fuera de Cloudflare, confirmar nameservers o apuntar DNS hacia Cloudflare.",
      commands: [
        "Revisar nameservers del dominio",
        "Confirmar que Cloudflare sea el DNS autoritativo",
        "Esperar propagacion antes del deploy final",
      ],
    },
    {
      title: "Deploy VPS",
      description: "Una vez confirmados DNS y SSL, ejecutar deploy para recompilar storefront y backend con el dominio nuevo.",
      commands: [
        "ssh mati@187.127.13.225",
        "bash /var/www/ecommerce/deploy.sh",
      ],
    },
    {
      title: "Verificacion",
      description: "Comprobar que storefront y backend reconozcan el dominio correcto.",
      commands: [
        `https://${domain}`,
        `https://${wwwDomain}`,
        `curl -s -H "x-store-host: ${domain}" http://127.0.0.1:3000/api/store/config`,
      ],
    },
  ];
}

function StoreFields({
  value,
  onChange,
  saving,
  submitLabel,
  compact,
  themes,
  mode = "default",
  showSubmitButton = true,
}: {
  value: StoreFormState;
  onChange: (patch: Partial<StoreFormState>) => void;
  saving: boolean;
  submitLabel: string;
  compact?: boolean;
  themes: ThemeOption[];
  mode?: "default" | "wizard";
  showSubmitButton?: boolean;
}) {
  const themeCards = themes.length > 0 ? themes : [{
    id: "minimal",
    label: "Minimal",
    description: "Fallback local",
    tone: "Base",
    surfaces: { background: "#06131a", panel: "#0d1f29", accent: "#53b7c7", text: "#f7fbfc" },
  }];

  return (
    <div className={`form-grid${compact ? " compact" : ""}`}>
      {[
        ["Nombre comercial", "name"],
        ["Dominio principal", "domain"],
        ["Owner email", "ownerEmail"],
        ["Owner nombre", "ownerName"],
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

      <div className="field span-2">
        <span>Theme base</span>
        <div className={`theme-choice-grid${mode === "wizard" ? " wizard" : ""}`}>
          {themeCards.map((theme) => {
            const active = value.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                className={`theme-choice-card${active ? " active" : ""}`}
                onClick={() => onChange({ theme: theme.id })}
              >
                <div
                  className="theme-choice-preview"
                  style={{
                    background: `linear-gradient(135deg, ${theme.surfaces.background}, ${theme.surfaces.panel})`,
                    color: theme.surfaces.text,
                  }}
                >
                  <span
                    className="theme-choice-chip"
                    style={{ background: theme.surfaces.accent, color: "#08141b" }}
                  >
                    {theme.tone}
                  </span>
                  <strong>{theme.label}</strong>
                </div>
                <div className="theme-choice-copy">
                  <strong>{theme.label}</strong>
                  <span>{theme.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
      {showSubmitButton ? (
        <button className="primary-button span-2" disabled={saving}>
          {saving ? "Guardando..." : submitLabel}
        </button>
      ) : null}
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
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [createStepIndex, setCreateStepIndex] = useState(0);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingStore, setLoadingStore] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);
  const [runningProvisioning, setRunningProvisioning] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProvisioningPlan | null>(null);
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

  async function loadProvisioningPlan(id: number) {
    return request<ProvisioningPlan>(`/system/stores/${id}/provisioning-plan`, {
      cache: "no-store",
    });
  }

  async function bootstrap() {
    const profile = await request<AuthUser>("/system/auth/me", {
      cache: "no-store",
    });
    const [nextStores, nextThemes] = await Promise.all([
      loadStores(),
      request<ThemeOption[]>("/system/themes", {
        cache: "no-store",
      }),
    ]);
    setUser(profile);
    setStores(nextStores);
    setThemes(nextThemes);
    const firstId = nextStores[0]?.id ?? null;
    setSelectedStoreId(firstId);
    if (firstId) {
      const [detail, plan] = await Promise.all([
        loadStore(firstId),
        loadProvisioningPlan(firstId),
      ]);
      setSelectedStore(detail);
      setSelectedPlan(plan);
      setEditState(storeToForm(detail));
    }
  }

  async function refresh(preferredId?: number | null) {
    const nextStores = await loadStores();
    setStores(nextStores);
    const nextId = preferredId && nextStores.some((store) => store.id === preferredId) ? preferredId : nextStores[0]?.id ?? null;
    setSelectedStoreId(nextId);
    if (nextId) {
      const [detail, plan] = await Promise.all([
        loadStore(nextId),
        loadProvisioningPlan(nextId),
      ]);
      setSelectedStore(detail);
      setSelectedPlan(plan);
      setEditState(storeToForm(detail));
    } else {
      setSelectedPlan(null);
    }
  }

  useEffect(() => {
    bootstrap().catch((error) => {
      setUser(null);
      setStores([]);
      setSelectedStore(null);
      setSelectedStoreId(null);
      setSelectedPlan(null);
      if (error instanceof Error && /401|403/.test(error.message)) {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "La sesion no es valida.");
    }).finally(() => setLoadingSession(false));
  }, []);

  useEffect(() => {
    if (tab !== "create") return;
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [tab]);

  useEffect(() => {
    if (!user || !selectedStoreId) return;
    setLoadingStore(true);
    Promise.all([
      loadStore(selectedStoreId),
      loadProvisioningPlan(selectedStoreId),
    ]).then(([store, plan]) => {
      setSelectedStore(store);
      setSelectedPlan(plan);
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
      setCreateStepIndex(0);
      setTab("stores");
      await refresh(created.id);
      setSuccessMessage(`La tienda ${created.name} ya quedo creada con owner y configuracion inicial.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo crear la tienda.");
    } finally {
      setSavingCreate(false);
    }
  }

  const selectedTheme =
    themes.find((theme) => theme.id === createState.theme) ?? themes[0] ?? null;
  const createChecklist = useMemo(
    () => buildProvisioningChecklist(createState.domain || "tu-dominio.com"),
    [createState.domain],
  );
  const createProgress = Math.round(((createStepIndex + 1) / createSteps.length) * 100);
  const generatedStoreName =
    createState.name.trim() || createSlugCandidate(createState.domain || "nueva-tienda").replace(/-/g, " ");
  const generatedWwwDomain = withWww(createState.domain || "");
  const createSummary = [
    { label: "Store name", value: generatedStoreName || "Pendiente" },
    { label: "Domain", value: createState.domain || "Pendiente" },
    { label: "Owner", value: createState.ownerEmail || "Pendiente" },
    { label: "Theme", value: selectedTheme?.label || createState.theme || "Pendiente" },
  ];

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

  async function onProvisionVps() {
    if (!user || !selectedStoreId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setRunningProvisioning(true);
    try {
      const result = await request<ProvisioningRunResult>(
        `/system/stores/${selectedStoreId}/provision-vps`,
        {
          method: "POST",
        },
      );
      setSelectedPlan(result.plan);
      await refresh(selectedStoreId);
      setSuccessMessage(
        `Provisioning VPS ejecutado. ${result.steps[result.steps.length - 1] ?? "Deploy completado."}`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo ejecutar el provisioning VPS.",
      );
    } finally {
      setRunningProvisioning(false);
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
    setSelectedPlan(null);
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
                        <span className={selectedStore.provisioning.vpsAutomationReady ? "status ok" : "status warn"}>
                          VPS
                        </span>
                        <span className="status neutral">DNS externo manual</span>
                      </div>
                      {loadingStore ? <p className="muted">Cargando configuracion...</p> : (
                        <>
                          <form className="stack-form" onSubmit={onSaveStore}><StoreFields value={editState} onChange={(patch) => setEditState((current) => ({ ...current, ...patch }))} saving={savingEdit} submitLabel="Guardar cambios" compact themes={themes} /></form>
                          {selectedPlan ? (
                            <div className="provisioning-panel">
                              <div className="panel-top">
                                <div>
                                  <p className="section-kicker">Provisioning VPS</p>
                                  <h2>Publicacion asistida</h2>
                                </div>
                                <button
                                  type="button"
                                  className="primary-button"
                                  disabled={!selectedPlan.automationEnabled || runningProvisioning}
                                  onClick={() => void onProvisionVps()}
                                >
                                  {runningProvisioning
                                    ? "Ejecutando..."
                                    : selectedPlan.automationEnabled
                                      ? "Ejecutar provisioning VPS"
                                      : "Automatizacion deshabilitada"}
                                </button>
                              </div>

                              <div className="review-grid">
                                <div className="review-card">
                                  <span>Domain</span>
                                  <strong>{selectedPlan.domain}</strong>
                                </div>
                                <div className="review-card">
                                  <span>Proxy target</span>
                                  <strong>{selectedPlan.proxyTarget}</strong>
                                </div>
                                <div className="review-card span-2">
                                  <span>Host map</span>
                                  <strong>{selectedPlan.entries.hostMap.join(", ")}</strong>
                                </div>
                                <div className="review-card span-2">
                                  <span>CORS</span>
                                  <strong>{selectedPlan.entries.corsOrigins.join(", ")}</strong>
                                </div>
                              </div>

                              <div className="command-grid">
                                <div className="command-card">
                                  <div className="command-head">
                                    <div>
                                      <strong>Nginx HTTP inicial</strong>
                                      <span>Prepara ACME y redireccion</span>
                                    </div>
                                  </div>
                                  <pre className="command-code">{selectedPlan.nginx.httpOnlyBlock}</pre>
                                </div>
                                <div className="command-card">
                                  <div className="command-head">
                                    <div>
                                      <strong>Nginx HTTPS final</strong>
                                      <span>Bloque productivo con proxy a storefront</span>
                                    </div>
                                  </div>
                                  <pre className="command-code">{selectedPlan.nginx.managedBlock}</pre>
                                </div>
                              </div>

                              <div className="check-grid vertical">
                                {selectedPlan.notes.map((note) => (
                                  <div key={note} className="check-card">
                                    <strong>Importante</strong>
                                    <span>{note}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </>
                  ) : <p className="muted">Elegi una tienda para editar branding, owner, dominio e integraciones.</p>}
                </article>
              </section>
            ) : null}

            {tab === "create" ? (
              <section className="content-grid">
                <article className="panel">
                  <div className="panel-top">
                    <div>
                      <p className="section-kicker">Provisioning</p>
                      <h2>Crear tienda nueva</h2>
                    </div>
                    <span className="pill">{createProgress}% completo</span>
                  </div>

                  <div className="wizard-steps">
                    {createSteps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        className={`wizard-step${index === createStepIndex ? " active" : ""}${index < createStepIndex ? " done" : ""}`}
                        onClick={() => setCreateStepIndex(index)}
                      >
                        <small>Paso {index + 1}</small>
                        <strong>{step.label}</strong>
                        <span>{step.detail}</span>
                      </button>
                    ))}
                  </div>

                  {createStepIndex === 0 ? (
                    <div className="stack-form">
                      <p className="muted">
                        El sistema crea store, owner y configuracion base automaticamente. Aca solo definis la identidad principal.
                      </p>
                      <div className="form-grid">
                        {[
                          ["Nombre comercial", "name"],
                          ["Dominio principal", "domain"],
                          ["Owner email", "ownerEmail"],
                          ["Owner nombre", "ownerName"],
                        ].map(([label, key]) => (
                          <label key={key} className="field">
                            <span>{label}</span>
                            <input
                              value={createState[key as keyof StoreFormState] as string}
                              onChange={(event) =>
                                setCreateState((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              type={key.toLowerCase().includes("email") ? "email" : "text"}
                            />
                          </label>
                        ))}
                        <label className="field span-2">
                          <span>Password owner</span>
                          <input
                            type="password"
                            value={createState.ownerPassword}
                            onChange={(event) =>
                              setCreateState((current) => ({
                                ...current,
                                ownerPassword: event.target.value,
                              }))
                            }
                            placeholder="Minimo 8 caracteres"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {createStepIndex === 1 ? (
                    <div className="stack-form">
                      <p className="muted">
                        Elegi el theme base ya cargado en la plataforma y definí el contenido inicial que la tienda recibe al crearse.
                      </p>
                      <StoreFields
                        value={createState}
                        onChange={(patch) => setCreateState((current) => ({ ...current, ...patch }))}
                        saving={false}
                        submitLabel="Continuar"
                        themes={themes}
                        mode="wizard"
                        showSubmitButton={false}
                      />
                    </div>
                  ) : null}

                  {createStepIndex === 2 ? (
                    <div className="stack-form">
                      <p className="muted">
                        Estas tareas no dependen del panel y siguen siendo obligatorias. La idea es que nunca más tengas que recordar el orden.
                      </p>
                      <div className="external-checklist">
                        {createChecklist.map((item) => (
                          <article key={item.title} className="external-card">
                            <div>
                              <p className="section-kicker">{item.title}</p>
                              <strong>{item.description}</strong>
                            </div>
                            <pre className="command-code">{item.commands.join("\n")}</pre>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {createStepIndex === 3 ? (
                    <form className="stack-form" onSubmit={onCreate}>
                      <div className="review-grid">
                        {createSummary.map((entry) => (
                          <div key={entry.label} className="review-card">
                            <span>{entry.label}</span>
                            <strong>{entry.value}</strong>
                          </div>
                        ))}
                        <div className="review-card span-2">
                          <span>Publicacion esperada</span>
                          <strong>{createState.domain ? `https://${createState.domain}` : "Pendiente de dominio"}</strong>
                          <small>{generatedWwwDomain ? `www: https://${generatedWwwDomain}` : "www se completa cuando hay dominio principal."}</small>
                        </div>
                        <div className="review-card span-2">
                          <span>Automatico desde panel</span>
                          <strong>Store, owner, config base, theme, dominio logico y checklist de lanzamiento</strong>
                        </div>
                      </div>
                      <button className="primary-button span-2" disabled={savingCreate}>
                        {savingCreate ? "Creando tienda..." : "Crear tienda y generar plan de lanzamiento"}
                      </button>
                    </form>
                  ) : null}

                  <div className="wizard-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={createStepIndex === 0}
                      onClick={() => setCreateStepIndex((current) => Math.max(current - 1, 0))}
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={createStepIndex === createSteps.length - 1}
                      onClick={() =>
                        setCreateStepIndex((current) =>
                          Math.min(current + 1, createSteps.length - 1),
                        )
                      }
                    >
                      Siguiente
                    </button>
                  </div>
                </article>
                <article className="panel">
                  <p className="section-kicker">Resumen operativo</p>
                  <h2>Lo que resuelve este wizard</h2>
                  <div className="check-grid vertical">
                    <div className="check-card"><strong>Automatico</strong><span>Crea store, owner, theme base, hero, branding inicial y configuracion de panel.</span></div>
                    <div className="check-card"><strong>Asistido</strong><span>Te deja un playbook fijo para DNS, Cloudflare y Hostinger sin tener que improvisar.</span></div>
                    <div className="check-card"><strong>VPS</strong><span>La ficha de cada tienda ahora puede preparar envs, Nginx y deploy desde un flujo controlado del backend.</span></div>
                  </div>
                  {selectedTheme ? (
                    <div className="theme-spotlight">
                      <p className="section-kicker">Theme elegido</p>
                      <div
                        className="theme-spotlight-preview"
                        style={{
                          background: `linear-gradient(145deg, ${selectedTheme.surfaces.background}, ${selectedTheme.surfaces.panel})`,
                          color: selectedTheme.surfaces.text,
                        }}
                      >
                        <span
                          className="theme-choice-chip"
                          style={{ background: selectedTheme.surfaces.accent, color: "#08141b" }}
                        >
                          {selectedTheme.tone}
                        </span>
                        <strong>{selectedTheme.label}</strong>
                        <small>{selectedTheme.description}</small>
                      </div>
                    </div>
                  ) : null}
                </article>
              </section>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}
