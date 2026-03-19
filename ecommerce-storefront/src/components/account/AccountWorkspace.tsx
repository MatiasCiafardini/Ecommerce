"use client";

import type { User } from "@/context/auth-context";
import OrdersSection from "./OrdersSection";
import ProfileSection from "./ProfileSection";
import AddressSection from "./AddressSection";
import PaymentSection from "./PaymentSection";
import AdminWorkspace from "./AdminWorkspace";

export type AccountSection =
  | "orders"
  | "profile"
  | "addresses"
  | "payments"
  | "admin-overview"
  | "admin-products"
  | "admin-categories"
  | "admin-orders"
  | "admin-customers";

type Props = {
  user: User;
  section: AccountSection;
  onSectionChange: (section: AccountSection) => void;
};

const adminSections: Array<{ id: AccountSection; label: string; description: string }> = [
  { id: "admin-overview", label: "Resumen", description: "Estado general" },
  { id: "admin-products", label: "Productos", description: "Catalogo y altas" },
  { id: "admin-categories", label: "Categorias", description: "Organizacion" },
  { id: "admin-orders", label: "Pedidos", description: "Operacion diaria" },
  { id: "admin-customers", label: "Clientes", description: "Base activa" },
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

  return (
    <section
      style={{
        padding: "72px 20px 96px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), #0b0b0b",
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
              color: "rgba(247,241,232,0.56)",
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
            gridTemplateColumns: "minmax(320px, 0.34fr) minmax(0, 1fr)",
            gap: 24,
            alignItems: "start",
          }}
        >
          <aside
            className="layout-sidebar"
            style={{
              padding: 28,
              borderRadius: 32,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              display: "grid",
              gap: 22,
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 14px",
                  color: "rgba(247,241,232,0.56)",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: 12,
                }}
              >
                {isAdmin ? "Operador" : "Cliente"}
              </p>
              <h2 style={{ margin: "0 0 8px", fontSize: 28 }}>{displayName || user.email}</h2>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "rgba(247,241,232,0.84)",
                  fontSize: 14,
                }}
              >
                {user.email}
              </p>
              <p style={{ margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.7 }}>
                {isAdmin
                  ? "Tu cuenta concentra tanto la gestion operativa como la parte comercial del storefront."
                  : "Gestiona tus datos, direcciones y preferencias antes del proximo checkout."}
              </p>
            </div>

            {isAdmin ? (
              <NavigationGroup
                title="Administracion"
                items={adminSections}
                activeSection={section}
                onSectionChange={onSectionChange}
              />
            ) : null}

            <NavigationGroup
              title="Cuenta"
              items={customerSections}
              activeSection={section}
              onSectionChange={onSectionChange}
            />
          </aside>

          <div style={{ display: "grid", gap: 24 }}>
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
}: {
  title: string;
  items: Array<{ id: AccountSection; label: string; description: string }>;
  activeSection: AccountSection;
  onSectionChange: (section: AccountSection) => void;
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: 18,
        display: "grid",
        gap: 10,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(247,241,232,0.48)",
        }}
      >
        {title}
      </p>
      {items.map((item) => {
        const active = activeSection === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            style={{
              borderRadius: 20,
              border: active
                ? "1px solid rgba(255,255,255,0.18)"
                : "1px solid rgba(255,255,255,0.08)",
              background: active ? "rgba(255,255,255,0.08)" : "rgba(8,8,8,0.35)",
              padding: "14px 16px",
              color: "#f7f1e8",
              textAlign: "left",
              cursor: "pointer",
              display: "grid",
              gap: 4,
            }}
          >
            <strong style={{ fontSize: 15 }}>{item.label}</strong>
            <span style={{ color: "rgba(247,241,232,0.62)", fontSize: 13 }}>
              {item.description}
            </span>
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
    case "admin-categories":
    case "admin-orders":
    case "admin-customers":
      return <AdminWorkspace section={section} />;
    case "orders":
    default:
      return <OrdersSection mode="full" />;
  }
}
