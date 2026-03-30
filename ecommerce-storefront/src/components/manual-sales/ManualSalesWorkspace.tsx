"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import AdminManualSalesSection from "@/components/account/AdminManualSalesSection";
import ThemeSelect from "@/components/ui/ThemeSelect";
import { money, orderStatusLabel } from "@/components/account/order-utils";

type ManualSaleOrder = {
  id: number;
  subtotal?: string | number;
  discountAmount?: string | number | null;
  total: string | number;
  status: string;
  createdAt: string;
  shippingCost?: string | number | null;
  customerEmailSnapshot?: string | null;
  customerFirstNameSnapshot?: string | null;
  customerLastNameSnapshot?: string | null;
  payments?: Array<{
    id: number;
    provider: string;
    method?: string | null;
    status: string;
    amount: string | number;
    metadata?: {
      origin?: string;
      discountType?: "percentage" | "fixed";
      discountValue?: number | string | null;
    } | null;
  }>;
  items?: Array<{
    id: number;
    quantity: number;
    price: string | number;
    variant: {
      id: number;
      sku?: string | null;
      product: {
        title: string;
      };
      Size?: string | null;
      Color?: string | null;
    };
  }>;
};

type EditDraft = {
  paymentMethod: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  items: Array<{
    orderItemId: number;
    title: string;
    variantLabel: string;
    quantity: number;
    price: string;
  }>;
};

const paymentOptions = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Transferencia", label: "Transferencia" },
];

const isManualSaleOrder = (order: ManualSaleOrder) =>
  (order.payments ?? []).some(
    (payment) =>
      payment.provider === "manual" || payment.metadata?.origin === "manual_sale",
  );

export default function ManualSalesWorkspace() {
  const [orders, setOrders] = useState<ManualSaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"manual-sale" | "metrics">("manual-sale");
  const [selectedOrder, setSelectedOrder] = useState<ManualSaleOrder | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api("/orders/manual/list");
      const nextOrders = Array.isArray(data) ? (data as ManualSaleOrder[]) : [];
      setOrders(nextOrders.filter(isManualSaleOrder));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el modulo de venta manual.",
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const summary = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const todayOrders = orders.filter(
      (order) => new Date(order.createdAt).toISOString().slice(0, 10) === todayKey,
    );
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    const averageTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      totalRevenue,
      todayRevenue,
      averageTicket,
    };
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  const draftTotal = useMemo(() => {
    if (!editDraft || !selectedOrder) return 0;
    const subtotal = editDraft.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.price || 0),
      0,
    );
    const discountAmount = calculateDiscountAmount(
      subtotal,
      editDraft.discountType,
      Number(editDraft.discountValue || 0),
    );
    return subtotal - discountAmount + Number(selectedOrder.shippingCost ?? 0);
  }, [editDraft, selectedOrder]);

  const openDetails = (order: ManualSaleOrder) => {
    setSelectedOrder(order);
    setModalMode("view");
    setEditDraft(null);
    setEditError("");
  };

  const openEdit = (order: ManualSaleOrder) => {
    setSelectedOrder(order);
    setModalMode("edit");
      setEditDraft({
        paymentMethod: getManualPaymentMethod(order),
        discountType: getManualDiscountType(order),
        discountValue: String(getManualDiscountValue(order)),
        items: (order.items ?? []).map((item) => ({
        orderItemId: item.id,
        title: item.variant.product.title,
        variantLabel: getVariantLabel(item.variant),
        quantity: item.quantity,
        price: String(item.price ?? ""),
      })),
    });
    setEditError("");
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setModalMode(null);
    setEditDraft(null);
    setEditError("");
    setSavingEdit(false);
  };

  const updateDraftItem = (
    orderItemId: number,
    updater: (item: EditDraft["items"][number]) => EditDraft["items"][number],
  ) => {
    setEditDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) =>
          item.orderItemId === orderItemId ? updater(item) : item,
        ),
      };
    });
  };

  const removeDraftItem = (orderItemId: number) => {
    setEditDraft((current) => {
      if (!current || current.items.length <= 1) return current;
      return {
        ...current,
        items: current.items.filter((item) => item.orderItemId !== orderItemId),
      };
    });
  };

  const saveEdit = async () => {
    if (!selectedOrder || !editDraft) return;

    setSavingEdit(true);
    setEditError("");

    try {
      const updated = (await api(`/orders/manual/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: editDraft.paymentMethod.trim() || undefined,
          discountType: editDraft.discountType,
          discountValue: Number(editDraft.discountValue || 0),
          items: editDraft.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            price: Number(item.price || 0),
          })),
        }),
      })) as ManualSaleOrder;

      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? updated : order)),
      );
      setSelectedOrder(updated);
      setModalMode("view");
      setEditDraft(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "No se pudo actualizar la venta manual.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <section
      data-account-shell
      style={{
        padding: "72px 20px 96px",
        background: "var(--account-shell-bg)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 24 }}>
        <section data-account-panel style={heroStyle}>
          <div style={{ display: "grid", gap: 10 }}>
            <p style={eyebrowStyle}>Modulo independiente</p>
            <h1 style={titleStyle}>Venta manual</h1>
            <p style={copyStyle}>
              Registra ventas manuales y consulta el historial del mostrador.
            </p>
          </div>
        </section>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <section data-account-panel style={tabRailPanelStyle}>
          <div style={tabRailStyle}>
            <button
              type="button"
              onClick={() => setActiveTab("manual-sale")}
              style={tabStyle(activeTab === "manual-sale")}
            >
              Venta manual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("metrics")}
              style={tabStyle(activeTab === "metrics")}
            >
              Metricas
            </button>
          </div>
        </section>

        {activeTab === "manual-sale" ? (
          <AdminManualSalesSection onSaleRegistered={loadOrders} />
        ) : (
          <>
            <section data-account-panel style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Dashboard</p>
                  <h2 style={sectionTitleStyle}>Metricas rapidas</h2>
                </div>
              </div>

              {loading ? (
                <StateCard label="Cargando metricas..." />
              ) : (
                <div style={statsGridStyle}>
                  <MetricCard
                    label="Ventas registradas"
                    value={String(summary.totalOrders)}
                    hint="Historico del modulo"
                  />
                  <MetricCard
                    label="Ventas de hoy"
                    value={String(summary.todayOrders)}
                    hint="Operaciones de la jornada"
                  />
                  <MetricCard
                    label="Facturacion total"
                    value={money(summary.totalRevenue)}
                    hint="Acumulado de venta manual"
                  />
                  <MetricCard
                    label="Facturacion hoy"
                    value={money(summary.todayRevenue)}
                    hint="Ingresos de hoy"
                  />
                  <MetricCard
                    label="Ticket promedio"
                    value={money(summary.averageTicket)}
                    hint="Promedio por venta"
                  />
                </div>
              )}
            </section>

            <section data-account-panel style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Historial</p>
                  <h2 style={sectionTitleStyle}>Ultimas ventas</h2>
                </div>
              </div>

              {loading ? (
                <StateCard label="Cargando historial..." />
              ) : recentOrders.length === 0 ? (
                <StateCard label="Todavia no hay ventas manuales registradas." />
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {recentOrders.map((order) => {
                    const displayName = getDisplayName(order);

                    return (
                      <article key={order.id} style={historyCardStyle}>
                        <div style={betweenStyle}>
                          <div>
                            <strong style={{ display: "block", color: "var(--text-strong)" }}>
                              Venta #{order.id}
                            </strong>
                            <span style={metaStyle}>
                              {new Date(order.createdAt).toLocaleString("es-AR")} · {displayName}
                            </span>
                          </div>
                          <strong style={{ color: "var(--text-strong)" }}>
                            {money(order.total)}
                          </strong>
                        </div>

                        <div style={betweenStyle}>
                          <span style={metaStyle}>{orderStatusLabel(order.status)}</span>
                          <span style={metaStyle}>{getManualPaymentMethod(order)}</span>
                        </div>

                        <div style={actionsRowStyle}>
                          <button
                            type="button"
                            onClick={() => openDetails(order)}
                            style={secondaryButtonStyle}
                          >
                            Ver detalles
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(order)}
                            style={ghostButtonStyle}
                          >
                            Editar venta
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedOrder && modalMode ? (
        <div style={modalOverlayStyle} onClick={closeModal}>
          <div
            data-account-panel
            style={modalCardStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={sectionHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>
                  {modalMode === "edit" ? "Editar venta" : "Detalle de venta"}
                </p>
                <h2 style={sectionTitleStyle}>Venta #{selectedOrder.id}</h2>
              </div>
              <strong style={{ color: "var(--text-strong)", fontSize: 24 }}>
                {modalMode === "edit" ? money(draftTotal) : money(selectedOrder.total)}
              </strong>
            </div>

            <div style={summaryGridStyle}>
              <InfoCard label="Fecha" value={new Date(selectedOrder.createdAt).toLocaleString("es-AR")} />
              <InfoCard label="Estado" value={orderStatusLabel(selectedOrder.status)} />
              <InfoCard label="Cliente" value={getDisplayName(selectedOrder)} />
              <InfoCard
                label="Pago"
                value={
                  modalMode === "edit" && editDraft
                    ? editDraft.paymentMethod
                    : getManualPaymentMethod(selectedOrder)
                }
              />
              <InfoCard
                label="Descuento"
                value={describeDiscount(
                  modalMode === "edit" && editDraft
                    ? editDraft.discountType
                    : getManualDiscountType(selectedOrder),
                  modalMode === "edit" && editDraft
                    ? Number(editDraft.discountValue || 0)
                    : getManualDiscountValue(selectedOrder),
                )}
              />
            </div>

            {modalMode === "edit" && editDraft ? (
              <section style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <p style={eyebrowStyle}>Metodo de pago</p>
                  <ThemeSelect
                    value={editDraft.paymentMethod}
                    onChange={(value) =>
                      setEditDraft((current) =>
                        current ? { ...current, paymentMethod: value } : current,
                      )
                    }
                    options={paymentOptions}
                    placeholder="Seleccionar metodo"
                  />
                </div>

                <div style={editDiscountGridStyle}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={eyebrowStyle}>Tipo de descuento</p>
                    <ThemeSelect
                      value={editDraft.discountType}
                      onChange={(value) =>
                        setEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                discountType: value === "fixed" ? "fixed" : "percentage",
                              }
                            : current,
                        )
                      }
                      options={[
                        { value: "percentage", label: "Porcentaje" },
                        { value: "fixed", label: "Importe" },
                      ]}
                      placeholder="Seleccionar descuento"
                    />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <p style={eyebrowStyle}>
                      {editDraft.discountType === "percentage"
                        ? "Descuento (%)"
                        : "Descuento ($)"}
                    </p>
                    <input
                      value={editDraft.discountValue}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current
                            ? {
                                ...current,
                                discountValue: event.target.value,
                              }
                            : current,
                        )
                      }
                      inputMode="decimal"
                      style={priceFieldStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {editDraft.items.map((item) => (
                    <article key={item.orderItemId} style={editLineCardStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <strong style={{ color: "var(--text-strong)" }}>{item.title}</strong>
                        <span style={metaStyle}>{item.variantLabel}</span>
                      </div>

                      <div style={editLineControlsStyle}>
                        <div style={counterWrapStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraftItem(item.orderItemId, (current) => ({
                                ...current,
                                quantity: Math.max(1, current.quantity - 1),
                              }))
                            }
                            style={counterButtonStyle}
                          >
                            -
                          </button>
                          <span style={counterValueStyle}>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateDraftItem(item.orderItemId, (current) => ({
                                ...current,
                                quantity: current.quantity + 1,
                              }))
                            }
                            style={counterButtonStyle}
                          >
                            +
                          </button>
                        </div>

                        <input
                          value={item.price}
                          onChange={(event) =>
                            updateDraftItem(item.orderItemId, (current) => ({
                              ...current,
                              price: event.target.value,
                            }))
                          }
                          inputMode="decimal"
                          style={priceFieldStyle}
                        />

                        <button
                          type="button"
                          onClick={() => removeDraftItem(item.orderItemId)}
                          disabled={editDraft.items.length <= 1}
                          style={{
                            ...dangerGhostButtonStyle,
                            opacity: editDraft.items.length <= 1 ? 0.45 : 1,
                            cursor: editDraft.items.length <= 1 ? "not-allowed" : "pointer",
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section style={{ display: "grid", gap: 12 }}>
                <article style={detailLineCardStyle}>
                  <div>
                    <strong style={{ display: "block", color: "var(--text-strong)" }}>
                      Resumen
                    </strong>
                    <span style={metaStyle}>
                      Subtotal {money(Number(selectedOrder.subtotal ?? selectedOrder.total ?? 0))}
                    </span>
                  </div>
                  <span style={metaStyle}>Descuento</span>
                  <strong style={{ color: "var(--text-strong)" }}>
                    - {money(Number(selectedOrder.discountAmount ?? 0))}
                  </strong>
                </article>
                {(selectedOrder.items ?? []).map((item) => (
                  <article key={item.id} style={detailLineCardStyle}>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-strong)" }}>
                        {item.variant.product.title}
                      </strong>
                      <span style={metaStyle}>{getVariantLabel(item.variant)}</span>
                    </div>
                    <span style={metaStyle}>x{item.quantity}</span>
                    <strong style={{ color: "var(--text-strong)" }}>{money(item.price)}</strong>
                  </article>
                ))}
              </section>
            )}

            {editError ? <p style={errorStyle}>{editError}</p> : null}

            <div style={modalActionsStyle}>
              <button type="button" onClick={closeModal} style={secondaryButtonStyle}>
                Cerrar
              </button>
              {modalMode === "view" ? (
                <button
                  type="button"
                  onClick={() => openEdit(selectedOrder)}
                  style={primaryButtonStyle}
                >
                  Editar venta
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  style={primaryButtonStyle}
                  disabled={savingEdit}
                >
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article style={metricCardStyle}>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={metricValueStyle}>{value}</strong>
      <span style={metaStyle}>{hint}</span>
    </article>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateCardStyle}>{label}</div>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <article style={infoCardStyle}>
      <p style={metricLabelStyle}>{label}</p>
      <strong style={{ color: "var(--text-strong)" }}>{value}</strong>
    </article>
  );
}

function getDisplayName(order: ManualSaleOrder) {
  return (
    [order.customerFirstNameSnapshot, order.customerLastNameSnapshot]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    order.customerEmailSnapshot ||
    "Venta mostrador"
  );
}

function getManualPaymentMethod(order: ManualSaleOrder) {
  return (
    (order.payments ?? []).find((payment) => payment.provider === "manual")?.method ??
    "Pago manual"
  );
}

function getManualDiscountType(order: ManualSaleOrder): "percentage" | "fixed" {
  const type = (order.payments ?? []).find((payment) => payment.provider === "manual")?.metadata
    ?.discountType;
  return type === "fixed" ? "fixed" : "percentage";
}

function getManualDiscountValue(order: ManualSaleOrder) {
  const rawValue = (order.payments ?? []).find((payment) => payment.provider === "manual")
    ?.metadata?.discountValue;
  const numericValue = Number(rawValue ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function calculateDiscountAmount(
  subtotal: number,
  discountType: "percentage" | "fixed",
  discountValue: number,
) {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(subtotal, 0) : 0;
  const safeValue = Number.isFinite(discountValue) ? Math.max(discountValue, 0) : 0;

  if (discountType === "percentage") {
    return (safeSubtotal * Math.min(safeValue, 100)) / 100;
  }

  return Math.min(safeValue, safeSubtotal);
}

function describeDiscount(
  discountType: "percentage" | "fixed",
  discountValue: number,
) {
  return discountType === "percentage"
    ? `${discountValue}%`
    : money(discountValue);
}

function getVariantLabel(variant: {
  sku?: string | null;
  Size?: string | null;
  Color?: string | null;
}) {
  return [variant.Size, variant.Color, variant.sku].filter(Boolean).join(" · ") || "Sin variante";
}

const heroStyle: React.CSSProperties = {
  borderRadius: 32,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: 28,
};

const panelStyle: React.CSSProperties = {
  borderRadius: 32,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: 24,
  display: "grid",
  gap: 18,
};

const tabRailPanelStyle: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: 10,
};

const tabRailStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const metricCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 18,
  display: "grid",
  gap: 8,
};

const infoCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 16,
  display: "grid",
  gap: 8,
};

const stateCardStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px dashed var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 20,
  color: "var(--text-muted)",
};

const historyCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 16,
  display: "grid",
  gap: 10,
};

const detailLineCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 14,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  gap: 12,
  alignItems: "center",
};

const editLineCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-strong-bg)",
  padding: 14,
  display: "grid",
  gap: 14,
};

const editLineControlsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const editDiscountGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(160px, 220px)",
  gap: 12,
  alignItems: "end",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const betweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: "rgba(0,0,0,0.58)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: "min(100%, 760px)",
  maxHeight: "min(88vh, 820px)",
  overflowY: "auto",
  borderRadius: 28,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  padding: 24,
  display: "grid",
  gap: 18,
};

const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap",
};

const counterWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  overflow: "hidden",
};

const counterButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  border: "none",
  background: "transparent",
  color: "var(--text-strong)",
  cursor: "pointer",
  fontSize: 18,
};

const counterValueStyle: React.CSSProperties = {
  minWidth: 34,
  textAlign: "center",
  color: "var(--text-strong)",
  fontWeight: 700,
};

const priceFieldStyle: React.CSSProperties = {
  minWidth: 140,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  color: "var(--text-strong)",
  outline: "none",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--text-muted)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2.2rem, 4vw, 4rem)",
  lineHeight: 0.95,
  letterSpacing: "-0.05em",
  color: "var(--text-strong)",
  textTransform: "uppercase",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(1.6rem, 2vw, 2.2rem)",
  color: "var(--text-strong)",
  letterSpacing: "-0.04em",
};

const metricLabelStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: 11,
  color: "var(--text-muted)",
};

const metricValueStyle: React.CSSProperties = {
  color: "var(--text-strong)",
  fontSize: 28,
  lineHeight: 1.1,
};

const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  lineHeight: 1.7,
  maxWidth: 760,
};

const metaStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--accent-strong)",
};

const primaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--accent-strong)",
  background: "var(--accent-soft)",
  color: "var(--text-strong)",
  padding: "12px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "transparent",
  color: "var(--text-strong)",
  padding: "12px 18px",
  cursor: "pointer",
};

const ghostButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  color: "var(--text-strong)",
  padding: "12px 18px",
  cursor: "pointer",
};

const dangerGhostButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(255,120,120,0.24)",
  background: "rgba(255,120,120,0.08)",
  color: "var(--text-strong)",
  padding: "10px 14px",
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: active
      ? "1px solid var(--accent-strong)"
      : "1px solid var(--border-soft)",
    background: active ? "var(--accent-soft)" : "var(--page-panel-strong-bg)",
    color: "var(--text-strong)",
    padding: "12px 18px",
    fontWeight: 600,
    cursor: "pointer",
    transition:
      "background 160ms ease, border-color 160ms ease, transform 160ms ease",
  };
}
