"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import AdminManualSalesSection from "@/components/account/AdminManualSalesSection";
import AdminCurrentAccountsSection from "@/components/account/AdminCurrentAccountsSection";
import ManualReturnsPanel from "@/components/manual-sales/ManualReturnsPanel";
import ThemeSelect from "@/components/ui/ThemeSelect";
import { money, orderStatusLabel, paymentMethodLabel } from "@/components/account/order-utils";
import { ADMIN_PAYMENT_METHODS } from "@/lib/manual-payment-methods";

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
      appliedCurrentAccountCreditAmount?: number | string | null;
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
  reason: string;
  paymentMethod: string;
  appliedCurrentAccountCreditAmount: number;
  payments: Array<{ method: string; amount: string }>;
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

type ManualSaleCustomer = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  document?: string | null;
  source?: string | null;
};

const paymentOptions = ADMIN_PAYMENT_METHODS.map((value) => ({ value, label: value }));

const isManualSaleOrder = (order: ManualSaleOrder) =>
  (order.payments ?? []).some(
    (payment) =>
      payment.provider === "manual" || payment.metadata?.origin === "manual_sale",
  );

const isCancelledOrder = (order: ManualSaleOrder) => order.status === "cancelled";

export default function ManualSalesWorkspace() {
  const [orders, setOrders] = useState<ManualSaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"manual-sale" | "current-accounts" | "returns" | "metrics">("manual-sale");
  const [initialSaleCustomer, setInitialSaleCustomer] = useState<ManualSaleCustomer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ManualSaleOrder | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [pendingCancelOrder, setPendingCancelOrder] = useState<ManualSaleOrder | null>(null);
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
    const activeOrders = orders.filter((order) => !isCancelledOrder(order));
    const todayOrders = orders.filter(
      (order) => new Date(order.createdAt).toISOString().slice(0, 10) === todayKey,
    );
    const activeTodayOrders = todayOrders.filter((order) => !isCancelledOrder(order));
    const totalRevenue = activeOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    const todayRevenue = activeTodayOrders.reduce(
      (sum, order) => sum + Number(order.total ?? 0),
      0,
    );
    const averageTicket = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

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
  const draftAmountToCollect = Math.max(
    draftTotal - Number(editDraft?.appliedCurrentAccountCreditAmount ?? 0),
    0,
  );

  useEffect(() => {
    if (modalMode !== "edit") return;
    setEditDraft((current) => {
      if (!current?.payments.length) return current;
      const otherTotal = current.payments
        .slice(0, -1)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const nextAmount = String(roundMoney(Math.max(draftAmountToCollect - otherTotal, 0)));
      const last = current.payments[current.payments.length - 1];
      if (last.amount === nextAmount) return current;
      return {
        ...current,
        payments: current.payments.map((payment, index) =>
          index === current.payments.length - 1 ? { ...payment, amount: nextAmount } : payment,
        ),
      };
    });
  }, [draftAmountToCollect, modalMode]);

  const openDetails = (order: ManualSaleOrder) => {
    setSelectedOrder(order);
    setModalMode("view");
    setEditDraft(null);
    setEditError("");
  };

  const openEdit = (order: ManualSaleOrder) => {
    if (isCancelledOrder(order)) {
      setEditError("Las ventas canceladas no se pueden editar.");
      return;
    }

    setSelectedOrder(order);
    setModalMode("edit");
    setEditDraft({
      reason: "",
      paymentMethod: getManualPaymentMethod(order),
      appliedCurrentAccountCreditAmount: getAppliedCurrentAccountCreditAmount(order),
      payments: getManualPayments(order).map((payment) => ({
        method: payment.method,
        amount: String(payment.amount),
      })),
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

  const startCurrentAccountSale = (customer: ManualSaleCustomer) => {
    setInitialSaleCustomer(customer);
    setActiveTab("manual-sale");
  };

  const requestCancelSale = (order: ManualSaleOrder) => {
    if (isCancelledOrder(order) || cancellingOrderId) return;
    setPendingCancelOrder(order);
    setError("");
    setEditError("");
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

    const normalizedPayments = editDraft.payments.map((payment) => ({
      method: payment.method,
      amount: roundMoney(Number(payment.amount || 0)),
    }));
    const paymentTotal = roundMoney(
      normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0),
    );
    if (normalizedPayments.some((payment) => payment.amount < 0)) {
      setEditError("Los importes de pago no pueden ser negativos.");
      return;
    }
    if (new Set(normalizedPayments.map((payment) => payment.method)).size !== normalizedPayments.length) {
      setEditError("No se puede repetir el mismo metodo en pagos divididos.");
      return;
    }
    if (Math.abs(paymentTotal - roundMoney(draftAmountToCollect)) > 0.01) {
      setEditError("La suma de los pagos debe coincidir con el total de la venta.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const updated = (await api(`/orders/manual/${selectedOrder.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentMethod: editDraft.paymentMethod.trim() || undefined,
          payments: normalizedPayments,
          reason: editDraft.reason.trim() || undefined,
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

  const confirmCancelSale = async () => {
    const order = pendingCancelOrder;
    if (!order) return;
    if (isCancelledOrder(order) || cancellingOrderId) return;

    setCancellingOrderId(order.id);
    setError("");
    setEditError("");

    try {
      const updated = (await api(`/orders/manual/${order.id}/cancel`, {
        method: "PATCH",
      })) as ManualSaleOrder;

      setOrders((current) =>
        current.map((currentOrder) =>
          currentOrder.id === updated.id ? updated : currentOrder,
        ),
      );
      setSelectedOrder((current) =>
        current?.id === updated.id ? updated : current,
      );
      setModalMode("view");
      setEditDraft(null);
      setPendingCancelOrder(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cancelar la venta manual.";

      if (selectedOrder?.id === order.id) {
        setEditError(message);
      } else {
        setError(message);
      }
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <section
      data-account-shell
      style={{
        padding: "24px 0 72px",
        background: "var(--account-shell-bg)",
      }}
    >
      <div style={{ width: "100%", display: "grid", gap: 24 }}>
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
              onClick={() => setActiveTab("current-accounts")}
              style={tabStyle(activeTab === "current-accounts")}
            >
              Cuentas corrientes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("returns")}
              style={tabStyle(activeTab === "returns")}
            >
              Devoluciones
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
          <AdminManualSalesSection
            onSaleRegistered={loadOrders}
            initialCustomer={initialSaleCustomer}
            initialPaymentMethod={initialSaleCustomer ? "Cuenta corriente" : undefined}
          />
        ) : activeTab === "current-accounts" ? (
          <AdminCurrentAccountsSection onRegisterSale={startCurrentAccountSale} />
        ) : activeTab === "returns" ? (
          <ManualReturnsPanel />
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
                          <span style={metaStyle}>{describeOrderPayments(order)}</span>
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
                            disabled={isCancelledOrder(order)}
                            style={ghostButtonStyle}
                          >
                            Editar venta
                          </button>
                          <button
                            type="button"
                            onClick={() => requestCancelSale(order)}
                            disabled={isCancelledOrder(order) || cancellingOrderId === order.id}
                            style={{
                              ...dangerGhostButtonStyle,
                              opacity:
                                isCancelledOrder(order) || cancellingOrderId === order.id
                                  ? 0.5
                                  : 1,
                              cursor:
                                isCancelledOrder(order) || cancellingOrderId === order.id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {cancellingOrderId === order.id ? "Cancelando..." : "Cancelar venta"}
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
                    ? describePayments(editDraft.payments)
                    : describeOrderPayments(selectedOrder)
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
                <div style={{ display: "grid", gap: 10 }}>
                  <p style={eyebrowStyle}>Pagos</p>
                  {editDraft.payments.map((payment, index) => (
                    <div key={`${index}-${payment.method}`} style={editDiscountGridStyle}>
                      <ThemeSelect
                        value={payment.method}
                        onChange={(value) => setEditDraft((current) => current ? {
                          ...current,
                          paymentMethod: index === 0 ? value : current.paymentMethod,
                          payments: current.payments.map((entry, paymentIndex) =>
                            paymentIndex === index ? { ...entry, method: value } : entry,
                          ),
                        } : current)}
                        options={paymentOptions}
                        placeholder="Seleccionar metodo"
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={payment.amount}
                          onChange={(event) => setEditDraft((current) => current ? {
                            ...current,
                            payments: current.payments.map((entry, paymentIndex) =>
                              paymentIndex === index ? { ...entry, amount: event.target.value } : entry,
                            ),
                          } : current)}
                          inputMode="decimal"
                          aria-label={`Importe pago ${index + 1}`}
                          style={priceFieldStyle}
                        />
                        {editDraft.payments.length > 1 ? (
                          <button type="button" style={ghostButtonStyle} onClick={() =>
                            setEditDraft((current) => current ? {
                              ...current,
                              payments: current.payments.filter((_, paymentIndex) => paymentIndex !== index),
                            } : current)
                          }>Quitar</button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    disabled={editDraft.payments.length >= ADMIN_PAYMENT_METHODS.length}
                    onClick={() => setEditDraft((current) => {
                      if (!current) return current;
                      const used = new Set(current.payments.map((payment) => payment.method));
                      const method = ADMIN_PAYMENT_METHODS.find((item) => !used.has(item));
                      return method ? { ...current, payments: [...current.payments, { method, amount: "0" }] } : current;
                    })}
                  >Agregar otro medio de pago</button>
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

                <label style={{ display: "grid", gap: 8 }}>
                  <p style={eyebrowStyle}>Motivo interno (opcional)</p>
                  <textarea
                    value={editDraft.reason}
                    onChange={(event) =>
                      setEditDraft((current) =>
                        current
                          ? {
                              ...current,
                              reason: event.target.value,
                            }
                          : current,
                      )
                    }
                    placeholder="Ej: se cargo mal el precio"
                    style={{ ...priceFieldStyle, minHeight: 86, resize: "vertical" }}
                  />
                </label>

                <div style={editItemsTableWrapStyle}>
                  <table style={editItemsTableStyle}>
                    <thead>
                      <tr>
                        <th style={editItemsThStyle}>Descripcion</th>
                        <th style={editItemsThStyle}>Cantidad</th>
                        <th style={editItemsThStyle}>Precio unitario ($)</th>
                        <th style={editItemsThStyle}>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                  {editDraft.items.map((item) => (
                    <tr key={item.orderItemId}>
                      <td style={editItemsTdStyle}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong style={{ color: "var(--text-strong)" }}>{item.title}</strong>
                          <span style={metaStyle}>{item.variantLabel}</span>
                        </div>
                      </td>
                      <td style={editItemsTdStyle}>
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
                      </td>
                      <td style={editItemsTdStyle}>
                        <input
                          aria-label={`Precio unitario de ${item.title}`}
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
                      </td>
                      <td style={editItemsTdStyle}>
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
                      </td>
                    </tr>
                  ))}
                    </tbody>
                  </table>
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
                <>
                  <button
                    type="button"
                    onClick={() => requestCancelSale(selectedOrder)}
                    disabled={
                      isCancelledOrder(selectedOrder) ||
                      cancellingOrderId === selectedOrder.id
                    }
                    style={{
                      ...dangerGhostButtonStyle,
                      opacity:
                        isCancelledOrder(selectedOrder) ||
                        cancellingOrderId === selectedOrder.id
                          ? 0.5
                          : 1,
                      cursor:
                        isCancelledOrder(selectedOrder) ||
                        cancellingOrderId === selectedOrder.id
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {cancellingOrderId === selectedOrder.id
                      ? "Cancelando..."
                      : "Cancelar venta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(selectedOrder)}
                    disabled={isCancelledOrder(selectedOrder)}
                    style={primaryButtonStyle}
                  >
                    Editar venta
                  </button>
                </>
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

      {pendingCancelOrder ? (
        <div style={modalOverlayStyle} onClick={() => setPendingCancelOrder(null)}>
          <div
            data-account-panel
            style={{ ...modalCardStyle, maxWidth: 460 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <p style={eyebrowStyle}>Cancelar venta</p>
              <h2 style={sectionTitleStyle}>Venta #{pendingCancelOrder.id}</h2>
              <p style={metaStyle}>
                Al cancelar la venta, el stock de sus productos vuelve al catalogo.
              </p>
            </div>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() => setPendingCancelOrder(null)}
                style={secondaryButtonStyle}
                disabled={cancellingOrderId === pendingCancelOrder.id}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelSale()}
                style={dangerGhostButtonStyle}
                disabled={cancellingOrderId === pendingCancelOrder.id}
              >
                {cancellingOrderId === pendingCancelOrder.id
                  ? "Cancelando..."
                  : "Confirmar cancelacion"}
              </button>
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
  const method = getManualPayments(order)[0]?.method;
  return paymentMethodLabel(method) || "Pago manual";
}

function getManualPayments(order: ManualSaleOrder) {
  const payments = (order.payments ?? [])
    .filter((payment) => payment.provider === "manual" || payment.metadata?.origin === "manual_sale")
    .map((payment) => ({
      method: payment.method?.trim() || "Efectivo",
      amount: Number(payment.amount ?? 0),
    }));
  return payments.length ? payments : [{ method: "Efectivo", amount: Number(order.total ?? 0) }];
}

function describePayments(payments: Array<{ method: string; amount: string | number }>) {
  return payments
    .map((payment) => `${paymentMethodLabel(payment.method)} ${money(payment.amount)}`)
    .join(" + ");
}

function describeOrderPayments(order: ManualSaleOrder) {
  return describePayments(getManualPayments(order));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function getAppliedCurrentAccountCreditAmount(order: ManualSaleOrder) {
  const value = (order.payments ?? []).find((payment) => payment.provider === "manual")
    ?.metadata?.appliedCurrentAccountCreditAmount;
  return Math.max(Number(value ?? 0), 0);
}

function calculateDiscountAmount(
  subtotal: number,
  discountType: "percentage" | "fixed",
  discountValue: number,
) {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(subtotal, 0) : 0;
  const safeValue = Number.isFinite(discountValue) ? Math.max(discountValue, 0) : 0;

  if (discountType === "percentage") {
    return Number(
      Math.min(safeSubtotal * (Math.min(safeValue, 100) / 100), safeSubtotal).toFixed(2),
    );
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

const editItemsTableWrapStyle: React.CSSProperties = { width: "100%", overflowX: "auto", border: "1px solid var(--border-soft)", borderRadius: 16 };
const editItemsTableStyle: React.CSSProperties = { width: "100%", minWidth: 650, borderCollapse: "collapse", background: "var(--page-panel-strong-bg)" };
const editItemsThStyle: React.CSSProperties = { padding: "11px 14px", textAlign: "left", borderBottom: "1px solid var(--border-soft)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" };
const editItemsTdStyle: React.CSSProperties = { padding: 14, borderBottom: "1px solid var(--border-soft)", verticalAlign: "middle" };

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
