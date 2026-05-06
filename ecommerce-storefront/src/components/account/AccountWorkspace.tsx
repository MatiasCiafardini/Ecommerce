"use client";

import { useEffect, useState } from "react";
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
  badgeCount?: number;
};

type AdminOrderSummary = {
  status?: string | null;
};

const PENDING_ORDERS_POLL_INTERVAL_MS = 30_000;
const ADMIN_ORDERS_UPDATED_EVENT = "admin-orders:updated";

const adminSections: NavigationItem[] = [
  { id: "admin-overview", label: "Resumen", description: "Estado general" },
  { id: "admin-accounting", label: "Contabilidad", description: "Export de ventas" },
  { id: "admin-products", label: "Productos", description: "Catalogo y altas" },
  { id: "admin-promotions", label: "Promociones", description: "Ofertas y cupones" },
  { id: "admin-settings", label: "Configuracion", description: "Pagos y tienda" },
  { id: "admin-orders", label: "Pedidos", description: "Operacion diaria" },
  { id: "admin-customers", label: "Clientes", description: "Base activa" },
  { id: "admin-shipments", label: "Envios", description: "Logistica y tracking" },
  { id: "admin-returns", label: "Devoluciones", description: "Postventa" },
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
  const adminNavigationSections = adminSections.map((item) =>
    item.id === "admin-orders"
      ? { ...item, badgeCount: pendingOrdersCount }
      : item,
  );

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
        padding: isCompactViewport ? "28px 12px 48px" : isNarrowViewport ? "40px 16px 64px" : "72px 20px 96px",
        background: "var(--account-shell-bg)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: isCompactViewport ? 20 : 28 }}>
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
            gridTemplateColumns: !showSidebar
              ? "1fr"
              : shouldCollapseSidebar
                ? "92px minmax(0, 1fr)"
                : "minmax(320px, 0.34fr) minmax(0, 1fr)",
            gap: isCompactViewport ? 16 : 24,
            alignItems: "stretch",
            transition: "grid-template-columns 240ms var(--ease-theme)",
          }}
        >
          {showSidebar ? (
          <aside
            className="layout-sidebar"
            onClick={shouldCollapseSidebar ? () => setSidebarCollapsed(false) : undefined}
            role={shouldCollapseSidebar ? "button" : undefined}
            aria-label={shouldCollapseSidebar ? "Abrir menu lateral" : undefined}
            title={shouldCollapseSidebar ? "Abrir menu lateral" : undefined}
            onMouseEnter={shouldCollapseSidebar ? () => setSidebarHover(true) : undefined}
            onMouseLeave={shouldCollapseSidebar ? () => setSidebarHover(false) : undefined}
            style={{
              padding: shouldCollapseSidebar ? 14 : isCompactViewport ? 18 : isNarrowViewport ? 22 : 28,
              borderRadius: isCompactViewport ? 24 : 32,
              border: shouldCollapseSidebar && sidebarHover
                ? "1px solid var(--account-item-border-active)"
                : "1px solid var(--account-sidebar-border)",
              background: shouldCollapseSidebar
                ? sidebarHover
                  ? "color-mix(in srgb, var(--account-sidebar-bg) 84%, var(--account-item-bg-active) 16%)"
                  : "color-mix(in srgb, var(--account-sidebar-bg) 92%, var(--account-item-bg-active) 8%)"
                : "var(--account-sidebar-bg)",
              display: "grid",
              alignContent: "start",
              alignItems: "start",
              gap: shouldCollapseSidebar ? 14 : isCompactViewport ? 16 : 22,
              position: "relative",
              alignSelf: "stretch",
              top: 0,
              overflow: "hidden",
              transition: "padding 240ms var(--ease-theme), gap 240ms var(--ease-theme), background 180ms var(--ease-theme), border-color 180ms var(--ease-theme), transform 180ms var(--ease-theme)",
              cursor: shouldCollapseSidebar ? "pointer" : "default",
              minHeight: "100%",
              transform: shouldCollapseSidebar && sidebarHover ? "translateX(-2px)" : "none",
            }}
          >
            {!shouldCollapseSidebar ? (
              <>
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
                  {!isNarrowViewport ? (
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

                {isAdmin ? (
                  <NavigationGroup
                    title="Administracion"
                    items={adminNavigationSections}
                    activeSection={section}
                    onSectionChange={onSectionChange}
                    collapsed={false}
                  />
                ) : null}

                <NavigationGroup
                  title="Cuenta"
                  items={customerSections}
                  activeSection={section}
                  onSectionChange={onSectionChange}
                  collapsed={false}
                />
                <button type="button" onClick={handleLogout} style={logoutButtonStyle}>
                  Cerrar sesion
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
}: {
  title: string;
  items: NavigationItem[];
  activeSection: AccountSection;
  onSectionChange: (section: AccountSection) => void;
  collapsed: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        border: "1px solid var(--account-group-border)",
        background: "var(--account-group-bg)",
        padding: collapsed ? 10 : 18,
        display: "grid",
        alignContent: "start",
        gap: 10,
      }}
    >
      {!collapsed ? (
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
              borderRadius: 20,
              border: active
                ? "1px solid var(--account-item-border-active)"
                : hasBadge
                  ? "1px solid var(--admin-tone-warning-border, var(--account-item-border-active))"
                  : "1px solid var(--account-item-border)",
              background: active
                ? "var(--account-item-bg-active)"
                : hasBadge
                  ? "var(--admin-tone-warning-bg, var(--account-item-bg-active))"
                  : "var(--account-item-bg)",
              padding: collapsed ? "12px 8px" : "14px 16px",
              color: hasBadge
                ? "var(--admin-tone-warning-color, var(--account-text-strong))"
                : "var(--account-text-strong)",
              textAlign: collapsed ? "center" : "left",
              cursor: "pointer",
              display: "grid",
              gap: 4,
              justifyItems: collapsed ? "center" : "start",
              position: "relative",
              boxShadow: hasBadge
                ? "0 0 0 3px color-mix(in srgb, var(--admin-tone-warning-color, var(--account-text-strong)) 10%, transparent)"
                : "none",
            }}
            >
            <span
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                gap: 10,
              }}
            >
              <strong style={{ fontSize: 15 }}>
                {collapsed ? abbreviateLabel(item.label) : item.label}
              </strong>
              {hasBadge ? <span style={navigationBadgeStyle}>{badgeLabel}</span> : null}
            </span>
            {!collapsed ? (
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
