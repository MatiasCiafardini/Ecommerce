"use client";

import { useEffect, useState } from "react";
import type { User } from "@/context/auth-context";
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

const adminSections: Array<{ id: AccountSection; label: string; description: string }> = [
  { id: "admin-overview", label: "Resumen", description: "Estado general" },
  { id: "admin-products", label: "Productos", description: "Catalogo y altas" },
  { id: "admin-categories", label: "Categorias", description: "Orden y visibilidad" },
  { id: "admin-promotions", label: "Promociones", description: "Ofertas y cupones" },
  { id: "admin-orders", label: "Pedidos", description: "Operacion diaria" },
  { id: "admin-customers", label: "Clientes", description: "Base activa" },
  { id: "admin-shipments", label: "Envios", description: "Logistica y tracking" },
  { id: "admin-returns", label: "Devoluciones", description: "Postventa" },
];

const customerSections: Array<{ id: AccountSection; label: string; description: string }> = [
  { id: "orders", label: "Pedidos", description: "Seguimiento y recibos" },
  { id: "profile", label: "Perfil", description: "Datos personales" },
  { id: "addresses", label: "Direcciones", description: "Entrega y checkout" },
  { id: "payments", label: "Pagos", description: "Billetera y medios" },
];

export default function AccountWorkspace({ user, section, onSectionChange }: Props) {
  const isAdmin = user.role && user.role !== "CUSTOMER";
  const displayName = [user.name, user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("account-sidebar-collapsed") === "true";
  });
  const [sidebarHover, setSidebarHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("account-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <section
      data-account-shell
      style={{
        padding: "72px 20px 96px",
        background: "var(--account-shell-bg)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
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
            gridTemplateColumns: sidebarCollapsed
              ? "92px minmax(0, 1fr)"
              : "minmax(320px, 0.34fr) minmax(0, 1fr)",
            gap: 24,
            alignItems: "stretch",
            transition: "grid-template-columns 240ms var(--ease-theme)",
          }}
        >
          <aside
            className="layout-sidebar"
            onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
            role={sidebarCollapsed ? "button" : undefined}
            aria-label={sidebarCollapsed ? "Abrir menu lateral" : undefined}
            title={sidebarCollapsed ? "Abrir menu lateral" : undefined}
            onMouseEnter={sidebarCollapsed ? () => setSidebarHover(true) : undefined}
            onMouseLeave={sidebarCollapsed ? () => setSidebarHover(false) : undefined}
            style={{
              padding: sidebarCollapsed ? 14 : 28,
              borderRadius: 32,
              border: sidebarCollapsed && sidebarHover
                ? "1px solid var(--account-item-border-active)"
                : "1px solid var(--account-sidebar-border)",
              background: sidebarCollapsed
                ? sidebarHover
                  ? "color-mix(in srgb, var(--account-sidebar-bg) 84%, var(--account-item-bg-active) 16%)"
                  : "color-mix(in srgb, var(--account-sidebar-bg) 92%, var(--account-item-bg-active) 8%)"
                : "var(--account-sidebar-bg)",
              display: "grid",
              alignContent: "start",
              alignItems: "start",
              gap: sidebarCollapsed ? 14 : 22,
              position: "relative",
              alignSelf: "stretch",
              top: 0,
              overflow: "hidden",
              transition: "padding 240ms var(--ease-theme), gap 240ms var(--ease-theme), background 180ms var(--ease-theme), border-color 180ms var(--ease-theme), transform 180ms var(--ease-theme)",
              cursor: sidebarCollapsed ? "pointer" : "default",
              minHeight: "100%",
              transform: sidebarCollapsed && sidebarHover ? "translateX(-2px)" : "none",
            }}
          >
            {!sidebarCollapsed ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
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
                      fontSize: 28,
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
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    aria-label="Minimizar menu lateral"
                    title="Minimizar menu lateral"
                    style={collapseButtonStyle}
                  >
                    <ChevronIcon collapsed={false} />
                  </button>
                </div>

                {isAdmin ? (
                  <NavigationGroup
                    title="Administracion"
                    items={adminSections}
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

          <div
            style={{ display: "grid", gap: 24, minWidth: 0, alignSelf: "start" }}
            data-account-content
          >
            {renderSection(section, user)}
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
  items: Array<{ id: AccountSection; label: string; description: string }>;
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
                : "1px solid var(--account-item-border)",
              background: active ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
              padding: collapsed ? "12px 8px" : "14px 16px",
              color: "var(--account-text-strong)",
              textAlign: collapsed ? "center" : "left",
              cursor: "pointer",
              display: "grid",
              gap: 4,
              justifyItems: collapsed ? "center" : "start",
            }}
            >
            <strong style={{ fontSize: 15 }}>
              {collapsed ? abbreviateLabel(item.label) : item.label}
            </strong>
            {!collapsed ? (
              <span style={{ color: "var(--account-text-soft)", fontSize: 13 }}>
                {item.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function renderSection(section: AccountSection, user: User) {
  switch (section) {
    case "profile":
      return <ProfileSection user={user} />;
    case "addresses":
      return <AddressSection user={user} />;
    case "payments":
      return <PaymentSection />;
    case "admin-overview":
    case "admin-products":
    case "admin-promotions":
    case "admin-categories":
    case "admin-orders":
    case "admin-customers":
    case "admin-shipments":
    case "admin-returns":
      return <AdminWorkspace section={section} />;
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
