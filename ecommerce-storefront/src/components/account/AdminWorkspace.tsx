"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  money,
  type CustomerOrder,
} from "./order-utils";
import AdminProductsSection, {
  scopeCategoriesToActiveStore,
  type Category,
  type Product,
} from "./admin-products/AdminProductsSection";
import AdminCustomersSection, { type Customer } from "./admin-customers/AdminCustomersSection";
import AdminAccountingSection from "./admin-accounting/AdminAccountingSection";
import AdminOrdersPanelSection from "./admin-orders/AdminOrdersPanelSection";
import AdminShipmentsSection from "./AdminShipmentsSection";
import AdminReturnsSection from "./AdminReturnsSection";
import AdminPromotionsSection from "./AdminPromotionsSection";
import AdminLabelsGenerator from "./AdminLabelsGenerator";
import DeveloperModePanel from "./DeveloperModePanel";
import type { AdminReturn, AdminSection, AdminShipment } from "./admin-types";

type Props = {
  section: AdminSection;
  user: {
    id: number;
    email: string;
    storeId?: number;
    role?: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    name?: string | null;
  };
  onSectionChange: (section: AdminSection) => void;
};


const operationalPendingStatuses = new Set([
  "pending",
  "paid",
  "processing",
  "packed",
]);

export default function AdminWorkspace({
  section,
  user,
  onSectionChange,
}: Props) {
  if (section === "admin-developer")
    return (
      <AdminDeveloperSection
        user={user}
        onBack={() => onSectionChange("admin-overview")}
      />
    );
  if (section === "admin-accounting") return <AdminAccountingSection />;
  if (section === "admin-products") return <AdminProductsSection />;
  if (section === "admin-labels") return <AdminLabelsSection />;
  if (section === "admin-categories")
    return <AdminProductsSection initialTab="categories" />;
  if (section === "admin-orders") return <AdminOrdersPanelSection />;
  if (section === "admin-customers") return <AdminCustomersSection />;
  if (section === "admin-shipments") return <AdminShipmentsSection />;
  if (section === "admin-returns") return <AdminReturnsSection />;
  if (section === "admin-promotions") return <AdminPromotionsSection />;
  if (section === "admin-settings") return <AdminSettingsSection />;
  return (
    <AdminOverviewSection
      onOpenDeveloper={() => onSectionChange("admin-developer")}
    />
  );
}

type AdminPaymentConfig = {
  bankTransfer?: {
    alias?: string | null;
    discountPercentage?: number | null;
  } | null;
};

function AdminSettingsSection() {
  const [settingsTab, setSettingsTab] = useState<"transfer">("transfer");
  const [alias, setAlias] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    api("/store/admin/integrations")
      .then((config: AdminPaymentConfig) => {
        if (!mounted) return;
        setAlias(config?.bankTransfer?.alias?.trim() ?? "");
        setDiscountPercentage(String(Number(config?.bankTransfer?.discountPercentage ?? 0)));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuracion.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function onSaveTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await api("/store/admin/integrations/bank-transfer", {
        method: "PUT",
        body: JSON.stringify({
          alias,
          discountPercentage: Number(discountPercentage || 0),
        }),
      });
      const bankTransfer = (response as AdminPaymentConfig).bankTransfer;
      setAlias(bankTransfer?.alias?.trim() ?? "");
      setDiscountPercentage(String(Number(bankTransfer?.discountPercentage ?? 0)));
      setMessage("Configuracion de transferencia guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la transferencia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={panelStyle}>
      <div style={tabRailStyle}>
        <button
          type="button"
          style={workspaceTabStyle(settingsTab === "transfer")}
          onClick={() => setSettingsTab("transfer")}
        >
          Transferencia
        </button>
      </div>

      {settingsTab === "transfer" ? (
        <form style={blockStyle} onSubmit={onSaveTransfer}>
          <div>
            <p style={eyebrowStyle}>Pagos</p>
            <h3 style={title3Style}>Transferencia bancaria</h3>
            <p style={copyStyle}>Este alias aparece para los clientes antes de subir el comprobante.</p>
          </div>

          {loading ? <p style={copyStyle}>Cargando configuracion...</p> : null}
          {error ? <p style={{ ...copyStyle, color: "#ffb7b7" }}>{error}</p> : null}
          {message ? <p style={{ ...copyStyle, color: "var(--admin-tone-success-color)" }}>{message}</p> : null}

          <div style={optionGridStyle}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={metaStyle}>Alias de transferencia</span>
              <input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                maxLength={80}
                placeholder="ej: mi.tienda.mp"
                style={fieldStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={metaStyle}>Descuento por transferencia (%)</span>
              <input
                value={discountPercentage}
                onChange={(event) => setDiscountPercentage(event.target.value)}
                type="number"
                min={0}
                max={100}
                step="0.01"
                style={fieldStyle}
              />
            </label>
          </div>

          <div style={itemStyle}>
            <span style={metaStyle}>Vista cliente</span>
            <strong>{alias.trim() || "Alias pendiente"}</strong>
            <small style={copyStyle}>
              {Number(discountPercentage || 0) > 0
                ? `${Number(discountPercentage || 0)}% de descuento por transferencia`
                : "Sin descuento adicional configurado"}
            </small>
          </div>

          <button type="submit" disabled={saving || loading} style={primaryButtonStyle}>
            {saving ? "Guardando..." : "Guardar transferencia"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function AdminOverviewSection({
  onOpenDeveloper,
}: {
  onOpenDeveloper: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c, o, u, s, r] = await Promise.all([
          api("/products"),
          api("/categories"),
          api("/orders"),
          api("/customers"),
          api("/admin/shipments"),
          api("/returns"),
        ]);
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? scopeCategoriesToActiveStore(c as Category[]) : []);
        setOrders(Array.isArray(o) ? o : []);
        setCustomers(Array.isArray(u) ? u : []);
        setShipments(Array.isArray(s) ? (s as AdminShipment[]) : []);
        setReturns(Array.isArray(r) ? (r as AdminReturn[]) : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section style={panelStyle}>
      <Header
        title="Panel general"
        copy="Resumen general de la tienda."
        actions={
          <button
            type="button"
            onClick={onOpenDeveloper}
            style={primaryButtonStyle}
          >
            Modo desarrollador
          </button>
        }
      />
      {loading ? (
        <StateCard label="Cargando resumen..." />
      ) : (
        <div style={statsGridStyle}>
          <Stat label="Productos" value={String(products.length)} />
          <Stat label="Categorias" value={String(categories.length)} />
          <Stat label="Clientes" value={String(customers.length)} />
          <Stat
            label="Pedidos pendientes"
            value={String(
              orders.filter((item) =>
                operationalPendingStatuses.has(item.status),
              ).length,
            )}
          />
          <Stat
            label="Envios activos"
            value={String(
              shipments.filter(
                (item) =>
                  !["delivered", "returned", "failed"].includes(item.status),
              ).length,
            )}
          />
          <Stat
            label="Devoluciones abiertas"
            value={String(
              returns.filter((item) => item.status === "requested").length,
            )}
          />
          <Stat
            label="Facturacion"
            value={money(
              orders.reduce((sum, item) => sum + Number(item.total ?? 0), 0),
            )}
          />
        </div>
      )}
    </section>
  );
}

function AdminLabelsSection() {
  return <AdminLabelsGenerator />;
}

function AdminDeveloperSection({
  user,
  onBack,
}: {
  user: Props["user"];
  onBack: () => void;
}) {
  return (
    <section style={panelStyle}>
      <Header
        title="Modo desarrollador"
        copy="Edita bloques, fondos, textos y productos destacados de la home."
        actions={
          <button type="button" onClick={onBack} style={secondaryButtonStyle}>
            Volver al panel general
          </button>
        }
      />
      <DeveloperModePanel user={user} forceExpanded />
    </section>
  );
}

function Header({
  actions,
}: {
  title?: string;
  copy?: string;
  actions?: React.ReactNode;
}) {
  if (!actions) return null;

  return (
    <div style={{ ...betweenStyle, minWidth: 0, width: "100%" }}>
      <div
        style={{
          display: "grid",
          justifyItems: "end",
          gap: 10,
          minWidth: 0,
          flex: "1 1 320px",
          maxWidth: "min(100%, 520px)",
          marginLeft: "auto",
        }}
      >
        {actions}
      </div>
    </div>
  );
}

function Step({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...blockStyle, height: "100%" }}>
      <div>
        <p style={eyebrowStyle}>Carga</p>
        <h3 style={title3Style}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article style={statStyle}>
      <span style={metaStyle}>{label}</span>
      <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
        {value}
      </strong>
    </article>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};
const shellStyle: React.CSSProperties = { display: "grid", gap: 18 };
const topGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 18,
  alignItems: "stretch",
};
const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
};
const ordersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(260px,100%),1fr))",
  gap: 16,
};
const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px,0.38fr) minmax(0,1fr)",
  gap: 20,
  alignItems: "start",
};
const optionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 12,
};
const optionValuesAreaStyle: React.CSSProperties = {
  minHeight: 124,
  alignContent: "start",
};
const optionActionsStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "end",
  marginTop: "auto",
  alignSelf: "end",
};
const selectedValuesBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};
const variantGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
  gap: 12,
};
const chipRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
const chipIconButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
  lineHeight: 1,
};
const chipInputStyle: React.CSSProperties = {
  width: 120,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--account-text-strong)",
};
const colorSwatchStyle = (color: string): React.CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: 999,
  border: "1px solid var(--checkout-border-strong)",
  background: color,
  flex: "0 0 auto",
});
const colorPickerStyle: React.CSSProperties = {
  width: 52,
  minHeight: 48,
  padding: 6,
  border: "1px solid var(--checkout-border)",
  borderRadius: 14,
  background: "var(--muted-field-bg)",
  cursor: "pointer",
};
const rowWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
const betweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap",
};
const tabRailStyle: React.CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  justifyContent: "start",
  alignItems: "center",
  gap: 10,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  overflowY: "hidden",
  paddingBottom: 4,
  scrollbarWidth: "thin",
};
const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  boxSizing: "border-box",
};
const categoryCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 220,
};
const categoryThumbStyle: React.CSSProperties = {
  width: 52,
  height: 38,
  borderRadius: 10,
  objectFit: "cover",
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  flex: "0 0 auto",
};
const categoryThumbPlaceholderStyle: React.CSSProperties = {
  ...categoryThumbStyle,
  display: "inline-block",
};
const categoryPreviewImageStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 240,
  objectFit: "cover",
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
};
const categoryImageEmptyStyle: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: 150,
  borderRadius: 18,
  border: "1px dashed var(--checkout-border-strong)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-soft)",
};
const attributeProductsTableWrapStyle: React.CSSProperties = {
  ...tableWrapStyle,
  maxHeight: 360,
  overflowY: "auto",
  borderBottom: "1px solid var(--checkout-border)",
};
const selectableRowStyle: React.CSSProperties = {
  cursor: "pointer",
};
const fieldStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  padding: "14px 16px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 16,
  outline: "none",
  boxSizing: "border-box",
};
const smallFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  padding: "12px 14px",
};
const searchFieldStyle: React.CSSProperties = {
  ...smallFieldStyle,
  width: "100%",
  minWidth: 280,
  maxWidth: 420,
};
const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  width: "100%",
  maxWidth: 260,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  appearance: "auto",
};
const largeFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  minHeight: 58,
  fontSize: 18,
};
const modernWorkspaceStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  width: "100%",
  minWidth: 0,
};
const wizardStepperStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};
const wizardStepButtonStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 52,
  borderRadius: 14,
  border: active ? "1px solid var(--accent-strong)" : "1px solid var(--checkout-border)",
  background: active ? "var(--accent-strong)" : "var(--page-panel-strong-bg)",
  color: active ? "var(--accent-contrast)" : "var(--account-text-strong)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 700,
});
const wizardPanelStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 20,
  display: "grid",
  gap: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  minHeight: 460,
  alignContent: "start",
};
const wizardTwoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
  gap: 16,
  alignItems: "start",
};
const wizardSubpanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  minWidth: 0,
};
const publicationGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};
const publicationChoiceStyle = (active: boolean): React.CSSProperties => ({
  minHeight: 120,
  borderRadius: 18,
  border: active ? "2px solid var(--accent-strong)" : "1px solid var(--checkout-border)",
  background: active ? "rgba(115, 181, 165, 0.72)" : "rgba(115, 181, 165, 0.22)",
  color: "var(--account-text-strong)",
  fontWeight: 800,
  cursor: "pointer",
});
const catalogToolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};
const iconActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};
const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-strong-bg)",
  color: "var(--account-text-strong)",
  display: "inline-grid",
  placeItems: "center",
  cursor: "pointer",
  fontWeight: 800,
};
const productThumbStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  objectFit: "cover",
  border: "1px solid var(--checkout-border)",
};
const productThumbEmptyStyle: React.CSSProperties = {
  display: "inline-block",
  width: 48,
  height: 48,
  borderRadius: 10,
  background: "var(--muted-field-bg)",
  border: "1px solid var(--checkout-border)",
};
const suggestionFieldWrapStyle: React.CSSProperties = { position: "relative" };
const suggestionDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 50,
  borderRadius: 18,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  boxShadow: "0 18px 42px rgba(79, 151, 191, 0.12)",
  padding: 8,
  display: "grid",
  gap: 6,
  maxHeight: 240,
  overflowY: "auto",
};
const suggestionItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid transparent",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  textAlign: "left",
  cursor: "pointer",
};
const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};
const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border-strong)",
  borderRadius: 999,
  cursor: "pointer",
};
const fullWidthSecondaryButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  width: "fit-content",
};
const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 999,
  cursor: "pointer",
};
const blockStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 20,
  display: "grid",
  gap: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};
const editingBannerStyle: React.CSSProperties = {
  ...blockStyle,
  gridTemplateColumns: "minmax(0,1fr) auto",
  alignItems: "center",
  gap: 12,
};
const itemStyle: React.CSSProperties = { ...blockStyle, gap: 10 };
const newOrderItemStyle: React.CSSProperties = {
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--admin-tone-warning-bg, var(--page-panel-bg)) 78%, var(--page-panel-bg) 22%), var(--page-panel-bg))",
  boxShadow:
    "0 0 0 3px color-mix(in srgb, var(--admin-tone-warning-color, var(--account-text-strong)) 10%, transparent)",
};
const groupPanelStyle: React.CSSProperties = { ...blockStyle, gap: 18 };
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: "var(--admin-overlay-bg)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};
const modalCardStyle: React.CSSProperties = {
  width: "min(100%, 560px)",
  maxHeight: "min(88vh, 720px)",
  overflowY: "auto",
  borderRadius: 28,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  boxShadow: "var(--admin-modal-shadow)",
  padding: 24,
  display: "grid",
  gap: 20,
};
const attributeModalStyle: React.CSSProperties = {
  ...modalCardStyle,
  width: "min(100%, 980px)",
  maxHeight: "min(92vh, 900px)",
};
const categoryModalStyle: React.CSSProperties = {
  ...attributeModalStyle,
  width: "min(100%, 1040px)",
};
const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};
const optionCardStyle: React.CSSProperties = {
  ...blockStyle,
  padding: 16,
  alignContent: "stretch",
  minHeight: 360,
  gridTemplateRows: "auto minmax(0, 1fr) auto",
};
const tableSectionStyle: React.CSSProperties = { ...blockStyle, gap: 16 };
const statStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--admin-stat-bg)",
  padding: 22,
  display: "grid",
  gap: 8,
};
const stateStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  padding: 24,
  color: "var(--account-text-muted)",
};
const metaStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
};
const helperTextStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
  lineHeight: 1.4,
};
const checkboxLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
  maxWidth: 720,
};
const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};
const title3Style: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 22,
  color: "var(--account-text-strong)",
};
const catalogTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-strong)",
  fontSize: 26,
  fontWeight: 800,
};
const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
const toastStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 1200,
  maxWidth: "min(360px, calc(100vw - 32px))",
  padding: "14px 18px",
  borderRadius: 18,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  color: "var(--account-text-strong)",
  boxShadow: "0 18px 44px rgba(0, 0, 0, 0.18)",
  fontWeight: 800,
  animation: "productToastIn 180ms ease-out",
};
const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0 0 12px",
  borderBottom: "1px solid var(--checkout-border)",
  color: "var(--account-text-soft)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};
const tdStyle: React.CSSProperties = {
  padding: "14px 0",
  borderBottom: "1px solid var(--checkout-border)",
  color: "var(--account-text-strong)",
  verticalAlign: "top",
};
const optionStyle: React.CSSProperties = {
  background: "var(--select-bg)",
  color: "var(--select-color)",
};
const statusStyle = (published: boolean): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: published
    ? "1px solid var(--admin-tone-success-border)"
    : "1px solid var(--admin-status-idle-border)",
  background: published
    ? "var(--admin-tone-success-bg)"
    : "var(--admin-status-idle-bg)",
  color: published
    ? "var(--admin-tone-success-color)"
    : "var(--admin-status-idle-color)",
  fontSize: 12,
});
const productCatalogStatusStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    status === "Publicado"
      ? "1px solid var(--admin-tone-success-border)"
      : status === "Sin stock"
        ? "1px solid var(--admin-danger-border)"
        : "1px solid var(--admin-status-idle-border)",
  background:
    status === "Publicado"
      ? "var(--admin-tone-success-bg)"
      : status === "Sin stock"
        ? "var(--admin-danger-bg)"
        : "var(--admin-status-idle-bg)",
  color:
    status === "Publicado"
      ? "var(--admin-tone-success-color)"
      : status === "Sin stock"
        ? "var(--admin-danger-color)"
        : "var(--admin-status-idle-color)",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
});
const statusChipStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    status === "cancelled"
      ? "1px solid var(--admin-danger-border)"
      : status === "delivered" || status === "picked_up"
        ? "1px solid var(--admin-tone-success-border)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "1px solid var(--admin-tone-info-border)"
          : "1px solid var(--admin-status-idle-border)",
  background:
    status === "cancelled"
      ? "var(--admin-danger-bg)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-bg)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "var(--admin-tone-info-bg)"
          : "var(--admin-status-idle-bg)",
  color:
    status === "cancelled"
      ? "var(--admin-danger-color)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-color)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "var(--admin-tone-info-color)"
          : "var(--admin-status-idle-color)",
  fontSize: 12,
});
const newOrderBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background: "var(--notification-badge-bg, #ff3b30)",
  color: "var(--notification-badge-color, #fff)",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};
const newOrderStatusChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background: "var(--admin-tone-warning-bg, var(--account-item-bg-active))",
  color: "var(--admin-tone-warning-color, var(--account-text-strong))",
  fontSize: 12,
  fontWeight: 700,
};
const softChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};
const workspaceTabStyle = (active: boolean): React.CSSProperties => ({
  flex: "0 0 auto",
  padding: "10px 14px",
  borderRadius: 999,
  border: active
    ? "1px solid var(--checkout-border-strong)"
    : "1px solid var(--checkout-border)",
  background: active ? "var(--accent-strong)" : "var(--page-panel-strong-bg)",
  color: active ? "var(--accent-contrast)" : "var(--account-text-strong)",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
});
const removeChipStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  cursor: "pointer",
};
