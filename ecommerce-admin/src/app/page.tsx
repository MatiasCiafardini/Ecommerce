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
type PlatformDeployResult = {
  ok: boolean;
  executedAt: string;
  command: string;
  outputPreview: string;
};
type StoreUser = {
  id: number;
  email: string;
  name?: string | null;
  role: "OWNER" | "ADMIN" | "STAFF";
  createdAt: string;
  isOwner: boolean;
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
      alias: string | null;
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
  bankTransferAlias: string;
  bankTransferDiscountPercentage: string;
};
type StoreUserFormState = {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "STAFF";
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
  bankTransferAlias: "",
  bankTransferDiscountPercentage: "0",
};
const emptyStoreUserForm: StoreUserFormState = {
  email: "",
  name: "",
  password: "",
  role: "ADMIN",
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
    bankTransferAlias: store.integrations.bankTransfer?.alias ?? "",
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

function userToForm(user: StoreUser): StoreUserFormState {
  return {
    email: user.email,
    name: user.name ?? "",
    password: "",
    role: user.role === "STAFF" ? "STAFF" : "ADMIN",
  };
}

function serializeStoreUserForm(value: StoreUserFormState) {
  return {
    email: value.email.trim(),
    name: value.name.trim(),
    password: value.password,
    role: value.role,
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
  const navigationItems = [
    {
      id: "overview" as const,
      label: "Overview",
      detail: "Estado general",
    },
    {
      id: "stores" as const,
      label: "Tiendas",
      detail: "Editor y publicacion",
    },
    {
      id: "create" as const,
      label: "Nueva tienda",
      detail: "Lanzamiento guiado",
    },
  ];
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
  const [storeSectionTab, setStoreSectionTab] = useState<
    "identity" | "commerce" | "settings" | "users" | "provisioning"
  >("identity");
  const [settingsTab, setSettingsTab] = useState<"transfer">("transfer");
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
  const [createUserState, setCreateUserState] = useState(emptyStoreUserForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserState, setEditUserState] = useState(emptyStoreUserForm);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingStore, setLoadingStore] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [savingLogin, setSavingLogin] = useState(false);
  const [runningProvisioning, setRunningProvisioning] = useState(false);
  const [runningPlatformDeploy, setRunningPlatformDeploy] = useState(false);
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

  async function loadStoreUsers(id: number) {
    return request<StoreUser[]>(`/system/stores/${id}/users`, {
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
      setStoreUsers([]);
      setCreateUserState(emptyStoreUserForm);
      setEditingUserId(null);
      setEditUserState(emptyStoreUserForm);
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
      setStoreUsers([]);
      setCreateUserState(emptyStoreUserForm);
      setEditingUserId(null);
      setEditUserState(emptyStoreUserForm);
    } else {
      setSelectedPlan(null);
      setStoreUsers([]);
      setCreateUserState(emptyStoreUserForm);
      setEditingUserId(null);
      setEditUserState(emptyStoreUserForm);
    }
  }

  useEffect(() => {
    bootstrap().catch((error) => {
      setUser(null);
      setStores([]);
      setSelectedStore(null);
      setSelectedStoreId(null);
      setSelectedPlan(null);
      setStoreUsers([]);
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
    if (tab !== "stores") return;
    setStoreSectionTab("identity");
  }, [selectedStoreId, tab]);

  useEffect(() => {
    if (storeSectionTab !== "users" || !user || !selectedStoreId) return;
    setLoadingUsers(true);
    loadStoreUsers(selectedStoreId)
      .then((users) => {
        setStoreUsers(users);
        if (editingUserId) {
          const currentEditingUser = users.find((candidate) => candidate.id === editingUserId);
          if (currentEditingUser) {
            setEditUserState(userToForm(currentEditingUser));
          } else {
            setEditingUserId(null);
            setEditUserState(emptyStoreUserForm);
          }
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
      })
      .finally(() => setLoadingUsers(false));
  }, [editingUserId, selectedStoreId, storeSectionTab, user]);

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

  async function refreshUsers(storeId: number, keepEditingUserId?: number | null) {
    const users = await loadStoreUsers(storeId);
    setStoreUsers(users);
    if (keepEditingUserId) {
      const currentEditingUser = users.find((candidate) => candidate.id === keepEditingUserId);
      if (currentEditingUser) {
        setEditingUserId(currentEditingUser.id);
        setEditUserState(userToForm(currentEditingUser));
        return;
      }
    }
    setEditingUserId(null);
    setEditUserState(emptyStoreUserForm);
  }

  function startEditingUser(userToEdit: StoreUser) {
    setEditingUserId(userToEdit.id);
    setEditUserState(userToForm(userToEdit));
  }

  function cancelEditingUser() {
    setEditingUserId(null);
    setEditUserState(emptyStoreUserForm);
  }

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

  async function onCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selectedStoreId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingUser(true);
    try {
      await request<StoreUser>(`/system/stores/${selectedStoreId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeStoreUserForm(createUserState)),
      });
      setCreateUserState(emptyStoreUserForm);
      await Promise.all([refresh(selectedStoreId), refreshUsers(selectedStoreId)]);
      setSuccessMessage("Usuario agregado correctamente a la tienda.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo agregar el usuario.");
    } finally {
      setSavingUser(false);
    }
  }

  async function onUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selectedStoreId || !editingUserId) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setSavingUser(true);
    try {
      const payload = serializeStoreUserForm(editUserState);
      await request<StoreUser>(`/system/stores/${selectedStoreId}/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          name: payload.name,
          password: payload.password || undefined,
          role: payload.role,
        }),
      });
      await Promise.all([refresh(selectedStoreId), refreshUsers(selectedStoreId, editingUserId)]);
      setSuccessMessage("Usuario actualizado correctamente.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el usuario.");
    } finally {
      setSavingUser(false);
    }
  }

  async function onDeleteUser(userToDelete: StoreUser) {
    if (!user || !selectedStoreId || userToDelete.isOwner) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setDeletingUserId(userToDelete.id);
    try {
      await request<{ ok: boolean }>(`/system/stores/${selectedStoreId}/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      await Promise.all([refresh(selectedStoreId), refreshUsers(selectedStoreId)]);
      setSuccessMessage(`Usuario ${userToDelete.email} eliminado.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    } finally {
      setDeletingUserId(null);
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

  async function onDeployPlatform() {
    if (!user) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setRunningPlatformDeploy(true);
    try {
      const result = await request<PlatformDeployResult>("/system/platform/deploy", {
        method: "POST",
      });
      setSuccessMessage(
        `Deploy ejecutado a las ${new Date(result.executedAt).toLocaleTimeString("es-AR")}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo ejecutar el deploy.",
      );
    } finally {
      setRunningPlatformDeploy(false);
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
    setStoreUsers([]);
    setCreateUserState(emptyStoreUserForm);
    setEditingUserId(null);
    setEditUserState(emptyStoreUserForm);
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
        <>
          <nav className="top-nav">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={`top-nav-button${tab === item.id ? " active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </button>
            ))}
          </nav>

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
                    {stores.slice(0, 5).map((store) => <button key={store.id} className="store-row" onClick={() => { setTab("stores"); setSelectedStoreId(store.id); }}><div className="store-row-copy"><strong>{store.name}</strong><span>{store.domain}</span></div><small>{formatDate(store.createdAt)}</small></button>)}
                  </div>
                </article>
                <article className="panel command-panel">
                  <div className="panel-top">
                    <div>
                      <p className="section-kicker">Comandos rápidos</p>
                      <h2>Flujo de deploy</h2>
                    </div>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={runningPlatformDeploy}
                      onClick={() => void onDeployPlatform()}
                    >
                      {runningPlatformDeploy ? "Ejecutando deploy..." : "Deploy plataforma"}
                    </button>
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
              <section className="store-shell">
                <article className="panel store-catalog">
                  <div className="panel-top"><div><p className="section-kicker">Portfolio</p><h2>Tiendas</h2></div><span className="pill">{stores.length} activas</span></div>
                  <div className="store-list">
                    {stores.map((store) => <button key={store.id} className={`store-row${selectedStoreId === store.id ? " selected" : ""}`} onClick={() => setSelectedStoreId(store.id)}><div className="store-row-copy"><strong>{store.name}</strong><span>{store.domain}</span></div><small>#{store.id}</small></button>)}
                  </div>
                </article>
                <article className="panel store-detail">
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
                      <div className="section-tabs">
                        <button type="button" className={`section-tab${storeSectionTab === "identity" ? " active" : ""}`} onClick={() => setStoreSectionTab("identity")}>Identidad</button>
                        <button type="button" className={`section-tab${storeSectionTab === "commerce" ? " active" : ""}`} onClick={() => setStoreSectionTab("commerce")}>Comercio</button>
                        <button type="button" className={`section-tab${storeSectionTab === "settings" ? " active" : ""}`} onClick={() => setStoreSectionTab("settings")}>Configuracion</button>
                        <button type="button" className={`section-tab${storeSectionTab === "users" ? " active" : ""}`} onClick={() => setStoreSectionTab("users")}>Usuarios</button>
                        <button type="button" className={`section-tab${storeSectionTab === "provisioning" ? " active" : ""}`} onClick={() => setStoreSectionTab("provisioning")}>Provisioning VPS</button>
                      </div>
                      {loadingStore ? <p className="muted">Cargando configuracion...</p> : null}
                      {!loadingStore && storeSectionTab === "identity" ? <form className="stack-form" onSubmit={onSaveStore}><StoreFields value={editState} onChange={(patch) => setEditState((current) => ({ ...current, ...patch }))} saving={savingEdit} submitLabel="Guardar cambios" compact themes={themes} /></form> : null}
                      {!loadingStore && storeSectionTab === "commerce" ? (
                        <div className="stack-form">
                          <div className="review-grid">
                            <div className="review-card"><span>Storefront</span><strong>{selectedStore.provisioning.storefrontReady ? "Listo" : "Pendiente"}</strong></div>
                            <div className="review-card"><span>Manual sales</span><strong>{selectedStore.features.manualSalesEnabled ? "Activa" : "Apagada"}</strong></div>
                            <div className="review-card"><span>Mercado Pago</span><strong>{selectedStore.integrations.mercadopago.publicKeyConfigured ? "Configurado" : "Pendiente"}</strong></div>
                            <div className="review-card"><span>Transferencia</span><strong>{selectedStore.integrations.bankTransfer.alias || "Sin alias"}</strong><small>{selectedStore.integrations.bankTransfer.discountPercentage}% de descuento</small></div>
                          </div>
                          <div className="command-grid">
                            <div className="command-card">
                              <div className="command-head">
                                <div><strong>Deploy local</strong><span>Subir cambios de codigo</span></div>
                                <button className="ghost-button" type="button" onClick={() => void copyCommandBlock(localDeployCommand, "Comando local")}>Copiar</button>
                              </div>
                              <pre className="command-code">{localDeployCommand}</pre>
                            </div>
                            <div className="command-card">
                              <div className="command-head">
                                <div><strong>Deploy VPS</strong><span>Recompila backend, storefront y admin</span></div>
                                <button className="ghost-button" type="button" onClick={() => void copyCommandBlock(vpsDeployCommand, "Comando VPS")}>Copiar</button>
                              </div>
                              <pre className="command-code">{vpsDeployCommand}</pre>
                            </div>
                            <div className="command-card">
                              <div className="command-head">
                                <div><strong>Deploy desde panel</strong><span>Ejecuta deploy.sh en la VPS</span></div>
                                <button className="primary-button" type="button" disabled={runningPlatformDeploy} onClick={() => void onDeployPlatform()}>
                                  {runningPlatformDeploy ? "Ejecutando..." : "Deploy plataforma"}
                                </button>
                              </div>
                              <pre className="command-code">{`POST ${apiUrl}/system/platform/deploy`}</pre>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {!loadingStore && storeSectionTab === "settings" ? (
                        <div className="settings-panel">
                          <div className="section-tabs compact-tabs">
                            <button type="button" className={`section-tab${settingsTab === "transfer" ? " active" : ""}`} onClick={() => setSettingsTab("transfer")}>Transferencia</button>
                          </div>
                          {settingsTab === "transfer" ? (
                            <form className="settings-card" onSubmit={onSaveStore}>
                              <div>
                                <p className="section-kicker">Pagos</p>
                                <h2>Transferencia bancaria</h2>
                                <p className="muted">
                                  Este alias se muestra en el checkout cuando el cliente elige pagar por transferencia.
                                </p>
                              </div>
                              <div className="form-grid">
                                <label className="field">
                                  <span>Alias de transferencia</span>
                                  <input
                                    value={editState.bankTransferAlias}
                                    onChange={(event) => setEditState((current) => ({ ...current, bankTransferAlias: event.target.value }))}
                                    type="text"
                                    placeholder="ej: mi.tienda.mp"
                                    maxLength={80}
                                  />
                                </label>
                                <label className="field">
                                  <span>Descuento por transferencia (%)</span>
                                  <input
                                    value={editState.bankTransferDiscountPercentage}
                                    onChange={(event) => setEditState((current) => ({ ...current, bankTransferDiscountPercentage: event.target.value }))}
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                  />
                                </label>
                              </div>
                              <div className="review-card">
                                <span>Vista cliente</span>
                                <strong>{editState.bankTransferAlias.trim() || "Alias pendiente"}</strong>
                                <small>
                                  {Number(editState.bankTransferDiscountPercentage || 0) > 0
                                    ? `${Number(editState.bankTransferDiscountPercentage || 0)}% de descuento aplicado al checkout`
                                    : "Sin descuento adicional configurado"}
                                </small>
                              </div>
                              <button className="primary-button" disabled={savingEdit}>
                                {savingEdit ? "Guardando..." : "Guardar transferencia"}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                      {!loadingStore && storeSectionTab === "users" ? (
                        <div className="users-panel">
                          <div className="review-grid">
                            <div className="review-card">
                              <span>Usuarios activos</span>
                              <strong>{storeUsers.length}</strong>
                            </div>
                            <div className="review-card">
                              <span>Owner protegido</span>
                              <strong>{selectedStore.owner?.email ?? "Sin owner"}</strong>
                              <small>El owner se puede editar, pero no eliminar.</small>
                            </div>
                          </div>

                          <div className="user-management-grid">
                            <form className="user-form-card" onSubmit={onCreateUser}>
                              <div>
                                <p className="section-kicker">Alta</p>
                                <h2>Agregar usuario</h2>
                              </div>
                              <div className="form-grid">
                                <label className="field">
                                  <span>Nombre</span>
                                  <input
                                    value={createUserState.name}
                                    onChange={(event) => setCreateUserState((current) => ({ ...current, name: event.target.value }))}
                                    type="text"
                                  />
                                </label>
                                <label className="field">
                                  <span>Email</span>
                                  <input
                                    value={createUserState.email}
                                    onChange={(event) => setCreateUserState((current) => ({ ...current, email: event.target.value }))}
                                    type="email"
                                    required
                                  />
                                </label>
                                <label className="field">
                                  <span>Rol</span>
                                  <select
                                    value={createUserState.role}
                                    onChange={(event) => setCreateUserState((current) => ({ ...current, role: event.target.value as "ADMIN" | "STAFF" }))}
                                  >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="STAFF">STAFF</option>
                                  </select>
                                </label>
                                <label className="field">
                                  <span>Password</span>
                                  <input
                                    value={createUserState.password}
                                    onChange={(event) => setCreateUserState((current) => ({ ...current, password: event.target.value }))}
                                    type="password"
                                    minLength={8}
                                    required
                                  />
                                </label>
                              </div>
                              <button className="primary-button" disabled={savingUser}>
                                {savingUser ? "Guardando..." : "Agregar usuario"}
                              </button>
                            </form>

                            <div className="user-form-card">
                              <div className="panel-top">
                                <div>
                                  <p className="section-kicker">Equipo</p>
                                  <h2>Usuarios de la tienda</h2>
                                </div>
                                <span className="pill">{storeUsers.length} usuarios</span>
                              </div>

                              {loadingUsers ? <p className="muted">Cargando usuarios...</p> : null}

                              {!loadingUsers ? (
                                <div className="user-list">
                                  {storeUsers.map((storeUser) => (
                                    <article key={storeUser.id} className="user-row-card">
                                      <div className="user-row-head">
                                        <div>
                                          <strong>{storeUser.name || "Sin nombre"}</strong>
                                          <span>{storeUser.email}</span>
                                        </div>
                                        <div className="user-badges">
                                          <span className={`status ${storeUser.isOwner ? "ok" : "neutral"}`}>{storeUser.role}</span>
                                          <span className="pill">Alta {formatDate(storeUser.createdAt)}</span>
                                        </div>
                                      </div>

                                      {editingUserId === storeUser.id ? (
                                        <form className="stack-form" onSubmit={onUpdateUser}>
                                          <div className="form-grid">
                                            <label className="field">
                                              <span>Nombre</span>
                                              <input
                                                value={editUserState.name}
                                                onChange={(event) => setEditUserState((current) => ({ ...current, name: event.target.value }))}
                                                type="text"
                                              />
                                            </label>
                                            <label className="field">
                                              <span>Email</span>
                                              <input
                                                value={editUserState.email}
                                                onChange={(event) => setEditUserState((current) => ({ ...current, email: event.target.value }))}
                                                type="email"
                                                required
                                              />
                                            </label>
                                            {!storeUser.isOwner ? (
                                              <label className="field">
                                                <span>Rol</span>
                                                <select
                                                  value={editUserState.role}
                                                  onChange={(event) => setEditUserState((current) => ({ ...current, role: event.target.value as "ADMIN" | "STAFF" }))}
                                                >
                                                  <option value="ADMIN">ADMIN</option>
                                                  <option value="STAFF">STAFF</option>
                                                </select>
                                              </label>
                                            ) : null}
                                            <label className="field">
                                              <span>{storeUser.isOwner ? "Nueva password owner" : "Nueva password"}</span>
                                              <input
                                                value={editUserState.password}
                                                onChange={(event) => setEditUserState((current) => ({ ...current, password: event.target.value }))}
                                                type="password"
                                                minLength={8}
                                                placeholder="Opcional"
                                              />
                                            </label>
                                          </div>
                                          <div className="user-row-actions">
                                            <button className="primary-button" disabled={savingUser}>
                                              {savingUser ? "Guardando..." : "Guardar cambios"}
                                            </button>
                                            <button className="ghost-button" type="button" onClick={cancelEditingUser}>
                                              Cancelar
                                            </button>
                                          </div>
                                        </form>
                                      ) : (
                                        <div className="user-row-actions">
                                          <button className="ghost-button" type="button" onClick={() => startEditingUser(storeUser)}>
                                            Editar
                                          </button>
                                          <button
                                            className="ghost-button danger-button"
                                            type="button"
                                            disabled={storeUser.isOwner || deletingUserId === storeUser.id}
                                            onClick={() => void onDeleteUser(storeUser)}
                                          >
                                            {storeUser.isOwner
                                              ? "Owner protegido"
                                              : deletingUserId === storeUser.id
                                                ? "Eliminando..."
                                                : "Eliminar"}
                                          </button>
                                        </div>
                                      )}
                                    </article>
                                  ))}
                                  {storeUsers.length === 0 ? <p className="muted">Esta tienda todavia no tiene usuarios cargados.</p> : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {!loadingStore && storeSectionTab === "provisioning" && selectedPlan ? (
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
                  ) : <p className="muted">Elegi una tienda para editar branding, owner, dominio e integraciones.</p>}
                </article>
              </section>
            ) : null}

            {tab === "create" ? (
              <section className="create-shell">
                <article className="panel create-main">
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
                <article className="panel create-side">
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
        </>
      )}
    </main>
  );
}
