"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money, type CustomerOrder } from "../order-utils";
import type { AdminReturn } from "../admin-types";



export type Customer = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
};


function useViewportFlags() {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const tabletQuery = window.matchMedia("(max-width: 1024px)");
    const phoneQuery = window.matchMedia("(max-width: 640px)");

    const sync = () => {
      setIsTabletOrSmaller(tabletQuery.matches);
      setIsPhone(phoneQuery.matches);
    };

    sync();
    tabletQuery.addEventListener("change", sync);
    phoneQuery.addEventListener("change", sync);

    return () => {
      tabletQuery.removeEventListener("change", sync);
      phoneQuery.removeEventListener("change", sync);
    };
  }, []);

  return {
    isTabletOrSmaller,
    isPhone,
  };
}

export default function AdminCustomersSection() {
  const { isTabletOrSmaller, isPhone } = useViewportFlags();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "summary" | "customers" | "segments" | "alerts"
  >("summary");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [customersData, ordersData, returnsData] = await Promise.all([
          api("/customers"),
          api("/orders"),
          api("/returns"),
        ]);
        setCustomers(Array.isArray(customersData) ? customersData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setReturns(
          Array.isArray(returnsData) ? (returnsData as AdminReturn[]) : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar clientes.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const customerRows = useMemo(() => {
    return customers.map((customer) => {
      const relatedOrders = orders.filter(
        (order) =>
          order.customer?.id === customer.id ||
          order.customerId === customer.id,
      );
      const relatedReturns = returns.filter((entry) =>
        relatedOrders.some((order) => order.id === entry.orderId),
      );
      const totalSpent = relatedOrders.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0,
      );
      const lastOrder = [...relatedOrders].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      const firstOrder = [...relatedOrders].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )[0];
      const segment = getCustomerSegment({
        ordersCount: relatedOrders.length,
        totalSpent,
        lastOrderAt: lastOrder?.createdAt ?? null,
      });

      return {
        customer,
        ordersCount: relatedOrders.length,
        returnsCount: relatedReturns.length,
        totalSpent,
        lastOrderAt: lastOrder?.createdAt ?? null,
        firstOrderAt: firstOrder?.createdAt ?? null,
        averageTicket: relatedOrders.length
          ? totalSpent / relatedOrders.length
          : 0,
        segment,
      };
    });
  }, [customers, orders, returns]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return customerRows;

    return customerRows.filter(({ customer, segment }) => {
      const fullName = [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        fullName.includes(normalizedQuery) ||
        (customer.email ?? "").toLowerCase().includes(normalizedQuery) ||
        (customer.phone ?? "").toLowerCase().includes(normalizedQuery) ||
        (customer.document ?? "").toLowerCase().includes(normalizedQuery) ||
        segment.label.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [customerRows, query]);

  const metrics = useMemo(() => {
    const totalCustomers = customerRows.length;
    const customersWithOrders = customerRows.filter(
      (row) => row.ordersCount > 0,
    ).length;
    const recurringCustomers = customerRows.filter(
      (row) => row.ordersCount > 1,
    ).length;
    const vipCustomers = customerRows.filter(
      (row) => row.segment.id === "vip",
    ).length;
    const incompleteProfiles = customerRows.filter(
      (row) => !row.customer.phone,
    ).length;
    const totalRevenue = customerRows.reduce(
      (sum, row) => sum + row.totalSpent,
      0,
    );

    return {
      totalCustomers,
      customersWithOrders,
      recurringCustomers,
      vipCustomers,
      incompleteProfiles,
      totalRevenue,
    };
  }, [customerRows]);

  const segmentCards = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; description: string; count: number }
    >();
    customerRows.forEach((row) => {
      const current = groups.get(row.segment.id) ?? {
        label: row.segment.label,
        description: row.segment.description,
        count: 0,
      };
      current.count += 1;
      groups.set(row.segment.id, current);
    });
    return [...groups.entries()].map(([id, value]) => ({ id, ...value }));
  }, [customerRows]);

  const alerts = useMemo(() => {
    return customerRows.flatMap((row) => {
      const items: Array<{ id: string; title: string; copy: string }> = [];
      const displayName = getCustomerDisplayName(row.customer);

      if (row.ordersCount === 0) {
        items.push({
          id: `no-orders-${row.customer.id}`,
          title: `${displayName} aun no compro`,
          copy: "Se registro en la tienda pero todavia no tiene pedidos asociados.",
        });
      }

      if (!row.customer.phone) {
        items.push({
          id: `missing-phone-${row.customer.id}`,
          title: `${displayName} sin telefono`,
          copy: "Conviene completar contacto para coordinar entregas o postventa.",
        });
      }

      if (row.returnsCount > 0) {
        items.push({
          id: `returns-${row.customer.id}`,
          title: `${displayName} tiene devoluciones`,
          copy: `${row.returnsCount} devolucion${row.returnsCount === 1 ? "" : "es"} registrada${row.returnsCount === 1 ? "" : "s"}.`,
        });
      }

      return items;
    });
  }, [customerRows]);

  return (
    <section style={panelStyle}>
      <Header
        title="Clientes"
        copy="Consulta clientes, compras y datos de contacto."
      />
      {error ? <p style={errorStyle}>{error}</p> : null}
      {loading ? (
        <StateCard label="Cargando clientes..." />
      ) : (
        <>
          <div style={statsGridStyle}>
            <Stat
              label="Clientes totales"
              value={String(metrics.totalCustomers)}
            />
            <Stat
              label="Con compra"
              value={String(metrics.customersWithOrders)}
            />
            <Stat
              label="Recurrentes"
              value={String(metrics.recurringCustomers)}
            />
            <Stat label="VIP" value={String(metrics.vipCustomers)} />
            <Stat
              label="Perfiles incompletos"
              value={String(metrics.incompleteProfiles)}
            />
            <Stat label="Facturacion" value={money(metrics.totalRevenue)} />
          </div>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Relacion con clientes</p>
                <h3 style={title3Style}>Vista operativa</h3>
              </div>
              <div style={rowWrapStyle}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nombre, telefono, email, documento o segmento"
                  style={{
                    ...searchFieldStyle,
                    minWidth: isTabletOrSmaller ? 0 : searchFieldStyle.minWidth,
                    width: isTabletOrSmaller ? "100%" : undefined,
                    flex: isTabletOrSmaller ? "1 1 100%" : "1 1 280px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                ...tabRailStyle,
                flexWrap: isPhone ? "nowrap" : "wrap",
                overflowX: isPhone ? "auto" : "visible",
                paddingBottom: isPhone ? 6 : 0,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                style={workspaceTabStyle(activeTab === "summary")}
              >
                Resumen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("customers")}
                style={workspaceTabStyle(activeTab === "customers")}
              >
                Clientes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("segments")}
                style={workspaceTabStyle(activeTab === "segments")}
              >
                Segmentos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                style={workspaceTabStyle(activeTab === "alerts")}
              >
                Alertas
              </button>
            </div>

            {activeTab === "summary" ? (
              <div style={statsGridStyle}>
                <article style={statStyle}>
                  <span style={metaStyle}>
                    Ticket promedio por cliente activo
                  </span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {money(
                      metrics.customersWithOrders
                        ? metrics.totalRevenue / metrics.customersWithOrders
                        : 0,
                    )}
                  </strong>
                </article>
                <article style={statStyle}>
                  <span style={metaStyle}>Tasa de recompra</span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {metrics.customersWithOrders
                      ? `${Math.round((metrics.recurringCustomers / metrics.customersWithOrders) * 100)}%`
                      : "0%"}
                  </strong>
                </article>
                <article style={statStyle}>
                  <span style={metaStyle}>Clientes nuevos</span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {customerRows.filter((row) => row.ordersCount === 1).length}
                  </strong>
                </article>
                <article style={statStyle}>
                  <span style={metaStyle}>Sin compra</span>
                  <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                    {customerRows.filter((row) => row.ordersCount === 0).length}
                  </strong>
                </article>
              </div>
            ) : null}

            {activeTab === "customers" ? (
              filteredRows.length ? (
                isTabletOrSmaller ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {filteredRows.map((row) => (
                      <article key={row.customer.id} style={{ ...itemStyle, padding: isPhone ? 16 : 18 }}>
                        <div style={betweenStyle}>
                          <div>
                            <strong style={{ display: "block", color: "var(--account-text-strong)" }}>
                              {getCustomerDisplayName(row.customer)}
                            </strong>
                            <span style={metaStyle}>Cliente #{row.customer.id}</span>
                          </div>
                          <span style={customerSegmentStyle(row.segment.tone)}>
                            {row.segment.label}
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span>{row.customer.email || row.customer.document || "Sin email"}</span>
                          <span style={metaStyle}>
                            {row.customer.phone || "Sin telefono cargado"}
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={copyStyle}>
                            {row.ordersCount} pedidos · Promedio {money(row.averageTicket)}
                          </span>
                          <strong style={{ color: "var(--account-text-strong)" }}>{money(row.totalSpent)}</strong>
                          <span style={metaStyle}>
                            {row.lastOrderAt
                              ? `Ultima compra ${new Date(row.lastOrderAt).toLocaleDateString("es-AR")}`
                              : "Sin compras"}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Cliente</th>
                          <th style={thStyle}>Contacto</th>
                          <th style={thStyle}>Pedidos</th>
                          <th style={thStyle}>Facturacion</th>
                          <th style={thStyle}>Ultima compra</th>
                          <th style={thStyle}>Segmento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr key={row.customer.id}>
                            <td style={tdStyle}>
                              <strong style={{ display: "block", color: "var(--account-text-strong)" }}>
                                {getCustomerDisplayName(row.customer)}
                              </strong>
                              <span style={metaStyle}>
                                Cliente #{row.customer.id}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: "grid", gap: 4 }}>
                                <span>{row.customer.email || row.customer.document || "Sin email"}</span>
                                <span style={metaStyle}>
                                  {row.customer.phone || "Sin telefono cargado"}
                                </span>
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: "grid", gap: 4 }}>
                                <span>{row.ordersCount}</span>
                                <span style={metaStyle}>
                                  Promedio {money(row.averageTicket)}
                                </span>
                              </div>
                            </td>
                            <td style={tdStyle}>{money(row.totalSpent)}</td>
                            <td style={tdStyle}>
                              {row.lastOrderAt
                                ? new Date(row.lastOrderAt).toLocaleDateString(
                                    "es-AR",
                                  )
                                : "Sin compras"}
                            </td>
                            <td style={tdStyle}>
                              <span
                                style={customerSegmentStyle(row.segment.tone)}
                              >
                                {row.segment.label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <StateCard label="No encontramos clientes con ese filtro." />
              )
            ) : null}

            {activeTab === "segments" ? (
              <div style={statsGridStyle}>
                {segmentCards.map((segment) => (
                  <article key={segment.id} style={statStyle}>
                    <span style={metaStyle}>{segment.label}</span>
                    <strong style={{ color: "var(--account-text-strong)", fontSize: 28 }}>
                      {segment.count}
                    </strong>
                    <span style={copyStyle}>{segment.description}</span>
                  </article>
                ))}
              </div>
            ) : null}

            {activeTab === "alerts" ? (
              alerts.length ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {alerts.map((alert) => (
                    <article key={alert.id} style={itemStyle}>
                      <strong style={{ color: "var(--account-text-strong)" }}>{alert.title}</strong>
                      <p style={copyStyle}>{alert.copy}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <StateCard label="No hay alertas activas sobre clientes en este momento." />
              )
            ) : null}
          </section>
        </>
      )}
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


function getCustomerDisplayName(customer: Customer) {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    customer.email ||
    customer.phone ||
    `Cliente #${customer.id}`
  );
}

function getCustomerSegment({
  ordersCount,
  totalSpent,
  lastOrderAt,
}: {
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}) {
  if (ordersCount === 0) {
    return {
      id: "lead",
      label: "Lead",
      description: "Se registro pero aun no hizo compras.",
      tone: "neutral" as const,
    };
  }

  if (ordersCount >= 4 || totalSpent >= 300000) {
    return {
      id: "vip",
      label: "VIP",
      description: "Cliente de alto valor con recurrencia fuerte.",
      tone: "success" as const,
    };
  }

  if (ordersCount >= 2) {
    return {
      id: "frequent",
      label: "Frecuente",
      description: "Ya repitio compra y conviene cuidarlo.",
      tone: "info" as const,
    };
  }

  if (lastOrderAt) {
    const daysSinceLastOrder = Math.floor(
      (Date.now() - new Date(lastOrderAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastOrder > 120) {
      return {
        id: "inactive",
        label: "Inactivo",
        description: "Hace tiempo que no vuelve a comprar.",
        tone: "warning" as const,
      };
    }
  }

  return {
    id: "new",
    label: "Nuevo",
    description: "Realizo su primera compra recientemente.",
    tone: "soft" as const,
  };
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
const customerSegmentStyle = (
  tone: "neutral" | "soft" | "info" | "success" | "warning",
): React.CSSProperties => {
  const palette = {
    neutral: {
      background: "var(--admin-status-idle-bg)",
      border: "var(--admin-status-idle-border)",
      color: "var(--admin-status-idle-color)",
    },
    soft: {
      background: "var(--admin-tone-soft-bg)",
      border: "var(--admin-tone-soft-border)",
      color: "var(--admin-tone-soft-color)",
    },
    info: {
      background: "var(--admin-tone-info-bg)",
      border: "var(--admin-tone-info-border)",
      color: "var(--admin-tone-info-color)",
    },
    success: {
      background: "var(--admin-tone-success-bg)",
      border: "var(--admin-tone-success-border)",
      color: "var(--admin-tone-success-color)",
    },
    warning: {
      background: "var(--admin-tone-warning-bg)",
      border: "var(--admin-tone-warning-border)",
      color: "var(--admin-tone-warning-color)",
    },
  } as const;

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${palette[tone].border}`,
    background: palette[tone].background,
    color: palette[tone].color,
    fontSize: 12,
    fontWeight: 700,
  };
};
const chipToggleStyle = (selected: boolean): React.CSSProperties => ({
  flex: "0 0 auto",
  minWidth: 44,
  maxWidth: 128,
  height: 40,
  padding: "9px 12px",
  borderRadius: 999,
  border: selected
    ? "1px solid var(--admin-chip-selected-border)"
    : "1px solid var(--admin-chip-border)",
  background: selected
    ? "var(--admin-chip-selected-bg)"
    : "var(--admin-chip-bg)",
  color: selected
    ? "var(--admin-chip-selected-color)"
    : "var(--admin-chip-color)",
  boxShadow: selected ? "var(--admin-chip-selected-shadow)" : "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});
const removeChipStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--admin-danger-border)",
  background: "var(--admin-danger-bg)",
  color: "var(--admin-danger-color)",
  cursor: "pointer",
};
