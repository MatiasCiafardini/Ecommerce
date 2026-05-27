"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import type { User } from "@/context/auth-context";
import { api } from "@/lib/api";
import OrdersSection from "./OrdersSection";
import ProfileSection from "./ProfileSection";
import AddressSection from "./AddressSection";
import PaymentSection from "./PaymentSection";
import AdminWorkspace from "./AdminWorkspace";
import type { AdminSection } from "./admin-types";

export type AccountSection =
  | "orders"
  | "profile"
  | "addresses"
  | "payments"
  | AdminSection;

type Props = {
  user: User;
  section: AccountSection;
  onSectionChange: (section: AccountSection) => void;
};

type NavigationItem = {
  id: AccountSection;
  label: string;
  description: string;
  icon?: string;
  badgeCount?: number;
};

type AdminOrderSummary = {
  status?: string | null;
};

const PENDING_ORDERS_POLL_INTERVAL_MS = 30_000;
const ADMIN_ORDERS_UPDATED_EVENT = "admin-orders:updated";

const adminSections: NavigationItem[] = [
  { id: "admin-overview", label: "Dashboard", description: "Estado general", icon: "dashboard" },
  { id: "admin-products", label: "Productos", description: "Catalogo y altas", icon: "products" },
  { id: "admin-labels", label: "Etiquetas", description: "Codigos de barras", icon: "labels" },
  { id: "admin-orders", label: "Pedidos", description: "Operacion diaria", icon: "orders" },
  { id: "admin-customers", label: "Clientes", description: "Base activa", icon: "customers" },
  { id: "admin-shipments", label: "Envios", description: "Logistica y tracking", icon: "shipments" },
  { id: "admin-returns", label: "Devoluciones", description: "Postventa", icon: "returns" },
  { id: "admin-promotions", label: "Promociones", description: "Ofertas y cupones", icon: "promotions" },
  { id: "admin-accounting", label: "Contabilidad", description: "Export de ventas", icon: "accounting" },
  { id: "admin-settings", label: "Configuracion", description: "Pagos y tienda", icon: "settings" },
];

const customerSections: NavigationItem[] = [
  { id: "orders", label: "Pedidos", description: "Seguimiento y recibos" },
  { id: "profile", label: "Perfil", description: "Datos personales" },
  { id: "addresses", label: "Direcciones", description: "Entrega y checkout" },
  { id: "payments", label: "Pagos", description: "Billetera y medios" },
];

export default function AccountWorkspace({ user, section, onSectionChange }: Props) {
  const router = useRouter();
  const { logout } = useAuth();
  const isAdmin = user.role && user.role !== "CUSTOMER";
  const displayName = [user.name, user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("account-sidebar-collapsed") === "true";
  });
  const [sidebarHover, setSidebarHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const narrowQuery = window.matchMedia("(max-width: 1024px)");
    const compactQuery = window.matchMedia("(max-width: 640px)");

    const syncViewport = () => {
      setIsNarrowViewport(narrowQuery.matches);
      setIsCompactViewport(compactQuery.matches);
    };

    syncViewport();
    narrowQuery.addEventListener("change", syncViewport);
    compactQuery.addEventListener("change", syncViewport);

    return () => {
      narrowQuery.removeEventListener("change", syncViewport);
      compactQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNarrowViewport) return;
    window.localStorage.setItem("account-sidebar-collapsed", String(sidebarCollapsed));
  }, [isNarrowViewport, sidebarCollapsed]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const shouldCollapseSidebar = sidebarCollapsed && !isNarrowViewport;
  const showSidebar = !isNarrowViewport;
  const useAdminSidebar = Boolean(isAdmin && showSidebar);
  const adminSidebarWidth = shouldCollapseSidebar ? 56 : 180;
  const adminNavigationSections = adminSections.map((item) =>
    item.id === "admin-orders"
      ? { ...item, badgeCount: pendingOrdersCount }
      : item,
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (useAdminSidebar) {
      root.style.setProperty("--admin-sidebar-offset", `${adminSidebarWidth}px`);
      root.dataset.adminSidebar = "true";
    } else {
      root.style.removeProperty("--admin-sidebar-offset");
      delete root.dataset.adminSidebar;
    }

    return () => {
      root.style.removeProperty("--admin-sidebar-offset");
      delete root.dataset.adminSidebar;
    };
  }, [adminSidebarWidth, useAdminSidebar]);

  useEffect(() => {
    if (!isAdmin) {
      setPendingOrdersCount(0);
      return;
    }

    let active = true;

    const loadPendingOrdersCount = async () => {
      try {
        const orders = (await api("/orders")) as AdminOrderSummary[];
        if (!active) return;

        setPendingOrdersCount(
          Array.isArray(orders)
            ? orders.filter((order) => order.status === "pending").length
            : 0,
        );
      } catch {
        if (active) {
          setPendingOrdersCount(0);
        }
      }
    };

    void loadPendingOrdersCount();
    const intervalId = window.setInterval(
      loadPendingOrdersCount,
      PENDING_ORDERS_POLL_INTERVAL_MS,
    );
    const handleFocus = () => void loadPendingOrdersCount();
    const handleOrdersUpdated = () => void loadPendingOrdersCount();
    window.addEventListener("focus", handleFocus);
    window.addEventListener(ADMIN_ORDERS_UPDATED_EVENT, handleOrdersUpdated);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(ADMIN_ORDERS_UPDATED_EVENT, handleOrdersUpdated);
    };
  }, [isAdmin]);

  return (
    <section
      data-account-shell
      style={{
        paddingTop: useAdminSidebar ? 24 : isCompactViewport ? 28 : isNarrowViewport ? 40 : 72,
        paddingRight: useAdminSidebar ? 24 : isCompactViewport ? 12 : isNarrowViewport ? 16 : 20,
        paddingBottom: useAdminSidebar ? 72 : isCompactViewport ? 48 : isNarrowViewport ? 64 : 96,
        paddingLeft: useAdminSidebar ? adminSidebarWidth + 24 : isCompactViewport ? 12 : isNarrowViewport ? 16 : 20,
        background: "var(--account-shell-bg)",
        minHeight: useAdminSidebar ? "100vh" : undefined,
        transition: "padding-left 180ms ease",
      }}
    >
      <div style={{ maxWidth: useAdminSidebar ? "none" : 1280, margin: useAdminSidebar ? "0" : "0 auto" }}>
        <div style={{ marginBottom: isCompactViewport ? 20 : 28, display: useAdminSidebar ? "none" : "block" }}>
          <p
            style={{
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 12,
              color: "var(--account-text-soft)",
            }}
          >
            {isAdmin ? "Cuenta y gestion" : "Mi perfil"}
          </p>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
              lineHeight: 0.95,
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "-0.06em",
            }}
          >
            Workspace
          </h1>
        </div>

        <div
          className="layout-two-col"
          style={{
            gridTemplateColumns: useAdminSidebar
              ? "minmax(0, 1fr)"
              : !showSidebar
              ? "1fr"
              : shouldCollapseSidebar
                ? "92px minmax(0, 1fr)"
                : "minmax(320px, 0.34fr) minmax(0, 1fr)",
            gap: useAdminSidebar ? 0 : isCompactViewport ? 16 : 24,
            alignItems: "stretch",
            transition: "grid-template-columns 240ms var(--ease-theme)",
          }}
        >
          {showSidebar ? (
          <aside
            className="layout-sidebar"
            onClick={!useAdminSidebar && shouldCollapseSidebar ? () => setSidebarCollapsed(false) : undefined}
            role={!useAdminSidebar && shouldCollapseSidebar ? "button" : undefined}
            aria-label={!useAdminSidebar && shouldCollapseSidebar ? "Abrir menu lateral" : "Menu administrativo"}
            title={!useAdminSidebar && shouldCollapseSidebar ? "Abrir menu lateral" : undefined}
            onMouseEnter={!useAdminSidebar && shouldCollapseSidebar ? () => setSidebarHover(true) : undefined}
            onMouseLeave={!useAdminSidebar && shouldCollapseSidebar ? () => setSidebarHover(false) : undefined}
            style={{
              width: useAdminSidebar ? adminSidebarWidth : undefined,
              padding: useAdminSidebar
                ? shouldCollapseSidebar ? "8px 0" : "8px 0 12px"
                : shouldCollapseSidebar ? 14 : isCompactViewport ? 18 : isNarrowViewport ? 22 : 28,
              borderRadius: useAdminSidebar ? 0 : isCompactViewport ? 24 : 32,
              border: useAdminSidebar
                ? "0"
                : shouldCollapseSidebar && sidebarHover
                ? "1px solid var(--account-item-border-active)"
                : "1px solid var(--account-sidebar-border)",
              background: useAdminSidebar
                ? "var(--account-sidebar-bg)"
                : shouldCollapseSidebar
                ? sidebarHover
                  ? "color-mix(in srgb, var(--account-sidebar-bg) 84%, var(--account-item-bg-active) 16%)"
                  : "color-mix(in srgb, var(--account-sidebar-bg) 92%, var(--account-item-bg-active) 8%)"
                : "var(--account-sidebar-bg)",
              display: "grid",
              alignContent: "start",
              alignItems: "start",
              gap: useAdminSidebar ? 0 : shouldCollapseSidebar ? 14 : isCompactViewport ? 16 : 22,
              position: useAdminSidebar ? "fixed" : "relative",
              alignSelf: "stretch",
              top: useAdminSidebar ? 0 : 0,
              left: useAdminSidebar ? 0 : undefined,
              bottom: useAdminSidebar ? 0 : undefined,
              zIndex: useAdminSidebar ? 60 : undefined,
              overflow: "hidden",
              transition: useAdminSidebar
                ? "width 180ms ease"
                : "padding 240ms var(--ease-theme), gap 240ms var(--ease-theme), background 180ms var(--ease-theme), border-color 180ms var(--ease-theme), transform 180ms var(--ease-theme)",
              cursor: !useAdminSidebar && shouldCollapseSidebar ? "pointer" : "default",
              minHeight: useAdminSidebar ? "100vh" : "100%",
              height: useAdminSidebar ? "100vh" : undefined,
              boxShadow: useAdminSidebar
                ? "8px 0 24px color-mix(in srgb, var(--account-text-strong) 14%, transparent)"
                : undefined,
              transform: !useAdminSidebar && shouldCollapseSidebar && sidebarHover ? "translateX(-2px)" : "none",
            }}
          >
            {useAdminSidebar || !shouldCollapseSidebar ? (
              <>
                {!useAdminSidebar ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                    <p
                      style={{
                        margin: "0 0 14px",
                        color: "var(--account-text-soft)",
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        fontSize: 12,
                      }}
                    >
                      {isAdmin ? "Operador" : "Cliente"}
                    </p>
                    <h2
                      style={{
                        margin: "0 0 8px",
                        fontSize: isCompactViewport ? 24 : 28,
                        color: "var(--account-text-strong)",
                      }}
                    >
                      {displayName || user.email}
                    </h2>
                    <p
                      style={{
                        margin: "0 0 10px",
                        color: "var(--account-text-muted)",
                        fontSize: 14,
                      }}
                    >
                      {user.email}
                    </p>
                    <p style={{ margin: 0, color: "var(--account-text-muted)", lineHeight: 1.7 }}>
                      {isAdmin
                        ? "Tu cuenta concentra tanto la gestion operativa como la parte comercial del storefront."
                        : "Gestiona tus datos, direcciones y preferencias antes del proximo checkout."}
                    </p>
                  </div>
                  {!isNarrowViewport && !useAdminSidebar ? (
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(true)}
                      aria-label="Minimizar menu lateral"
                      title="Minimizar menu lateral"
                      style={collapseButtonStyle}
                    >
                      <ChevronIcon collapsed={false} />
                    </button>
                  ) : null}
                </div>
                ) : null}

                {isAdmin ? (
                  <NavigationGroup
                    title="Administracion"
                    items={adminNavigationSections}
                    activeSection={section}
                    onSectionChange={onSectionChange}
                    collapsed={shouldCollapseSidebar}
                    mode={useAdminSidebar ? "wordpress" : "card"}
                  />
                ) : null}

                {!useAdminSidebar ? (
                  <NavigationGroup
                    title="Cuenta"
                    items={customerSections}
                    activeSection={section}
                    onSectionChange={onSectionChange}
                    collapsed={false}
                  />
                ) : null}
                {useAdminSidebar ? (
                  <div style={adminAccountPanelStyle(shouldCollapseSidebar)}>
                    {!shouldCollapseSidebar ? (
                      <>
                        <span style={adminAccountEyebrowStyle}>Cuenta</span>
                        <strong style={adminAccountNameStyle}>
                          {displayName || user.email}
                        </strong>
                        <span style={adminAccountEmailStyle}>{user.email}</span>
                        <button
                          type="button"
                          onClick={() => onSectionChange("profile")}
                          style={adminAccountActionStyle}
                        >
                          Mi cuenta
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          style={adminLogoutActionStyle}
                        >
                          Cerrar sesion
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSectionChange("profile")}
                          aria-label="Mi cuenta"
                          title="Mi cuenta"
                          style={adminCollapsedAccountButtonStyle}
                        >
                          <MenuIcon name="customers" />
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          aria-label="Cerrar sesion"
                          title="Cerrar sesion"
                          style={adminCollapsedAccountButtonStyle}
                        >
                          <LogoutIcon />
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={useAdminSidebar ? () => setSidebarCollapsed((current) => !current) : handleLogout}
                  style={useAdminSidebar ? adminCollapseButtonStyle(shouldCollapseSidebar) : logoutButtonStyle}
                  title={useAdminSidebar ? (shouldCollapseSidebar ? "Expandir menu" : "Minimizar menu") : undefined}
                >
                  {useAdminSidebar ? (
                    <>
                      <ChevronIcon collapsed={shouldCollapseSidebar} />
                      {!shouldCollapseSidebar ? <span>Minimizar menu</span> : null}
                    </>
                  ) : (
                    "Cerrar sesion"
                  )}
                </button>
              </>
            ) : (
              <div
                style={{
                  minHeight: "100%",
                  display: "grid",
                  placeItems: "center",
                  alignContent: "center",
                  gap: 16,
                  color: "var(--account-text-strong)",
                }}
              >
                <span style={collapsedHintIconStyle}>
                  <ChevronIcon collapsed />
                </span>
                <span
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    fontSize: 11,
                    color: "var(--account-text-soft)",
                  }}
                >
                  Abrir menu
                </span>
              </div>
            )}
          </aside>
          ) : null}

          <div
            style={{ display: "grid", gap: isCompactViewport ? 18 : 24, minWidth: 0, alignSelf: "start" }}
            data-account-content
          >
            {renderSection(section, user, onSectionChange)}
          </div>
        </div>
      </div>
    </section>
  );
}

function NavigationGroup({
  title,
  items,
  activeSection,
  onSectionChange,
  collapsed,
  mode = "card",
}: {
  title: string;
  items: NavigationItem[];
  activeSection: AccountSection;
  onSectionChange: (section: AccountSection) => void;
  collapsed: boolean;
  mode?: "card" | "wordpress";
}) {
  const isWordPressMode = mode === "wordpress";

  return (
    <div
      style={{
        borderRadius: isWordPressMode ? 0 : 24,
        border: isWordPressMode ? 0 : "1px solid var(--account-group-border)",
        background: isWordPressMode ? "transparent" : "var(--account-group-bg)",
        padding: isWordPressMode ? 0 : collapsed ? 10 : 18,
        display: "grid",
        alignContent: "start",
        gap: isWordPressMode ? 0 : 10,
      }}
    >
      {!collapsed && !isWordPressMode ? (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--account-text-faint)",
          }}
        >
          {title}
        </p>
      ) : null}
      {items.map((item) => {
        const active = activeSection === item.id;
        const badgeCount = Number(item.badgeCount ?? 0);
        const hasBadge = badgeCount > 0;
        const badgeLabel = badgeCount > 99 ? "99+" : String(badgeCount);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            title={collapsed ? `${item.label} · ${item.description}` : undefined}
            style={{
              minHeight: isWordPressMode ? 42 : undefined,
              width: "100%",
              borderRadius: isWordPressMode ? 0 : 20,
              border: isWordPressMode
                ? 0
                : active
                ? "1px solid var(--account-item-border-active)"
                : hasBadge
                  ? "1px solid var(--admin-tone-warning-border, var(--account-item-border-active))"
                  : "1px solid var(--account-item-border)",
              borderLeft: isWordPressMode && active ? "4px solid var(--account-item-border-active)" : undefined,
              background: isWordPressMode
                ? active
                  ? "var(--account-item-bg-active)"
                  : "transparent"
                : active
                ? "var(--account-item-bg-active)"
                : hasBadge
                  ? "var(--admin-tone-warning-bg, var(--account-item-bg-active))"
                  : "var(--account-item-bg)",
              padding: isWordPressMode ? (collapsed ? "10px 0" : "11px 14px") : collapsed ? "12px 8px" : "14px 16px",
              color: isWordPressMode
                ? active ? "var(--account-text-strong)" : "var(--account-text-muted)"
                : hasBadge
                ? "var(--admin-tone-warning-color, var(--account-text-strong))"
                : "var(--account-text-strong)",
              textAlign: collapsed ? "center" : "left",
              cursor: "pointer",
              display: isWordPressMode ? "flex" : "grid",
              alignItems: "center",
              justifyContent: isWordPressMode && collapsed ? "center" : undefined,
              gap: isWordPressMode ? 10 : 4,
              justifyItems: collapsed ? "center" : "start",
              position: "relative",
              boxShadow: !isWordPressMode && hasBadge
                ? "0 0 0 3px color-mix(in srgb, var(--admin-tone-warning-color, var(--account-text-strong)) 10%, transparent)"
                : "none",
            }}
            >
            {isWordPressMode ? <MenuIcon name={item.icon ?? "default"} /> : null}
            <span
              style={{
                display: isWordPressMode && collapsed ? "none" : "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                gap: 10,
              }}
            >
              <strong style={{ fontSize: 15 }}>
                {collapsed && !isWordPressMode ? abbreviateLabel(item.label) : collapsed ? "" : item.label}
              </strong>
              {hasBadge ? <span style={navigationBadgeStyle}>{badgeLabel}</span> : null}
            </span>
            {!collapsed && !isWordPressMode ? (
              <span style={{ color: "var(--account-text-soft)", fontSize: 13 }}>
                {hasBadge
                  ? `${item.description} · ${badgeCount} pendiente${badgeCount === 1 ? "" : "s"}`
                  : item.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function renderSection(
  section: AccountSection,
  user: User,
  onSectionChange: (section: AccountSection) => void,
) {
  switch (section) {
    case "profile":
      return <ProfileSection user={user} />;
    case "addresses":
      return <AddressSection user={user} />;
    case "payments":
      return <PaymentSection />;
    case "admin-overview":
    case "admin-accounting":
    case "admin-developer":
    case "admin-products":
    case "admin-labels":
    case "admin-promotions":
    case "admin-categories":
    case "admin-orders":
    case "admin-customers":
    case "admin-shipments":
    case "admin-returns":
    case "admin-settings":
      return <AdminWorkspace section={section} user={user} onSectionChange={onSectionChange} />;
    case "orders":
    default:
      return <OrdersSection mode="full" />;
  }
}


function abbreviateLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {collapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
    </svg>
  );
}

function MenuIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><path d="M4 13a8 8 0 0 1 16 0" /><path d="M12 13l4-5" /><path d="M7 17h10" /></>,
    products: <><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
    labels: <><path d="M4 7V4h3" /><path d="M17 4h3v3" /><path d="M20 17v3h-3" /><path d="M7 20H4v-3" /><path d="M7 8v8" /><path d="M10 8v8" /><path d="M14 8v8" /><path d="M17 8v8" /></>,
    orders: <><path d="M7 3h10v18H7z" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h4" /></>,
    customers: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    shipments: <><path d="M3 8h11v9H3z" /><path d="M14 11h4l3 3v3h-7z" /><path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></>,
    returns: <><path d="M9 7H5v4" /><path d="M5 11a7 7 0 1 0 2-5" /><path d="M12 8v5l3 2" /></>,
    promotions: <><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H8.5a2.5 2.5 0 1 1 0-5C12 2 12 7 12 7Z" /><path d="M12 7h3.5a2.5 2.5 0 1 0 0-5C12 2 12 7 12 7Z" /></>,
    accounting: <><path d="M4 3h16v18H4z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h3" /><path d="M15 15h1" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20h-3v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3v-3h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06A1.7 1.7 0 0 0 8.3 5.4a1.7 1.7 0 0 0 1-1.55V3h3v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1H21v3h-.09a1.7 1.7 0 0 0-1.55 1Z" /></>,
    default: <path d="M5 12h14" />,
  };

  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 20px", marginLeft: 0 }}
    >
      {paths[name] ?? paths.default}
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 20px" }}
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
      <path d="M14 21h5a2 2 0 0 0 2-2" />
    </svg>
  );
}

function adminSidebarHeaderStyle(collapsed: boolean): React.CSSProperties {
  return {
    height: 40,
    padding: collapsed ? "0 0" : "0 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 4,
  };
}

function adminBrandStyle(collapsed: boolean): React.CSSProperties {
  return {
    color: "#f0f0f1",
    fontSize: collapsed ? 16 : 14,
    letterSpacing: collapsed ? 0 : "0.03em",
    whiteSpace: "nowrap",
    overflow: "hidden",
  };
}

function adminCollapseButtonStyle(collapsed: boolean): React.CSSProperties {
  return {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    minHeight: 44,
    border: 0,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    background: "var(--account-sidebar-bg)",
    color: "var(--account-text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    gap: 10,
    padding: collapsed ? "0" : "0 14px",
    cursor: "pointer",
    fontSize: 13,
  };
}

function adminAccountPanelStyle(collapsed: boolean): React.CSSProperties {
  return {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 44,
    display: "grid",
    gap: collapsed ? 8 : 8,
    padding: collapsed ? "10px 8px" : "12px",
    borderTop: "1px solid color-mix(in srgb, var(--account-text-muted) 18%, transparent)",
    background:
      "color-mix(in srgb, var(--account-sidebar-bg) 92%, var(--account-item-bg-active) 8%)",
  };
}

const adminAccountEyebrowStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const adminAccountNameStyle: React.CSSProperties = {
  color: "var(--account-text-strong)",
  fontSize: 13,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const adminAccountEmailStyle: React.CSSProperties = {
  color: "var(--account-text-muted)",
  fontSize: 11,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const adminAccountActionStyle: React.CSSProperties = {
  minHeight: 34,
  border: "1px solid color-mix(in srgb, var(--account-text-muted) 20%, transparent)",
  background: "transparent",
  color: "var(--account-text-strong)",
  borderRadius: 8,
  padding: "8px 10px",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const adminLogoutActionStyle: React.CSSProperties = {
  ...adminAccountActionStyle,
  color: "var(--account-text-muted)",
};

const adminCollapsedAccountButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "0",
  borderRadius: 8,
  background: "transparent",
  color: "var(--account-text-muted)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const collapseButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 999,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flex: "0 0 auto",
} as const;

const collapsedHintIconStyle = {
  width: 52,
  height: 52,
  borderRadius: 999,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg-active)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--account-text-strong)",
} as const;

const navigationBadgeStyle = {
  minWidth: 22,
  height: 22,
  padding: "0 7px",
  borderRadius: 999,
  background: "var(--notification-badge-bg, #ff3b30)",
  color: "var(--notification-badge-color, #fff)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
  boxShadow: "0 0 0 2px var(--account-sidebar-bg)",
} as const;

const logoutButtonStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 20,
  border: "1px solid var(--checkout-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  textAlign: "left",
  fontSize: 15,
  fontWeight: 700,
} as const;
