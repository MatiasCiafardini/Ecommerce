"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import AdminOrderDetailPanel from "../AdminOrderDetailPanel";
import { money, type CustomerOrder } from "../order-utils";
import { AdminHeader, AdminMetricCard, AdminStateCard } from "../admin/shared/AdminUI";
import {
  ADMIN_ORDERS_POLL_INTERVAL_MS,
  ADMIN_ORDERS_UPDATED_EVENT,
  buildOrderQueueMetrics,
  buildOrdersSignature,
  getOrderQueueAction,
  isPickupOrder,
  matchesOrderFilter,
  orderCustomerName,
  orderCustomerPhone,
  orderDeliveryLabel,
  orderIssueLabels,
  orderMatchesQuery,
  orderQueueFilters,
  orderStatusLabelForDelivery,
  primaryPaymentLabel,
  primaryPaymentMethod,
  primaryPaymentStatus,
  type OrderQueueFilter,
} from "./admin-orders-utils";
import {
  errorStyle,
  eyebrowStyle,
  ghostButtonStyle,
  metaStyle,
  newOrderBadgeStyle,
  orderActionCellStyle,
  orderCellStackStyle,
  orderFilterButtonStyle,
  orderFilterCountStyle,
  orderFilterRailStyle,
  orderHeaderRowStyle,
  orderIssueChipStyle,
  orderIssueListStyle,
  orderPrimaryActionStyle,
  orderQueueShellStyle,
  orderQueueStatsStyle,
  orderRowItemStyle,
  orderRowStyle,
  orderSearchInputStyle,
  orderTableScrollStyle,
  orderTableStyle,
  orderToolbarStyle,
  panelStyle,
  softChipStyle,
  statusChipStyle,
  title3Style,
} from "./admin-orders-styles";

export default function AdminOrdersPanelSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const detailTopRef = useRef<HTMLDivElement | null>(null);
  const ordersSignatureRef = useRef("");
  const clearedOrderIdRef = useRef<number | null>(null);
  const pendingOpenOrderIdRef = useRef<number | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrderQueueFilter>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const load = async (showInitialLoading = false, notifyOnChange = false) => {
      try {
        if (showInitialLoading) {
          setLoading(true);
        }

        const data = await api("/orders");
        if (!active) return;

        const nextOrders = Array.isArray(data) ? (data as CustomerOrder[]) : [];
        const nextSignature = buildOrdersSignature(nextOrders);
        const hasLoadedBefore = Boolean(ordersSignatureRef.current);
        const changed = hasLoadedBefore && ordersSignatureRef.current !== nextSignature;
        ordersSignatureRef.current = nextSignature;
        setOrders(nextOrders);
        setError("");

        if (notifyOnChange && changed) {
          window.dispatchEvent(new CustomEvent(ADMIN_ORDERS_UPDATED_EVENT));
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar pedidos.");
      } finally {
        if (active && showInitialLoading) {
          setLoading(false);
        }
      }
    };

    void load(true, false);

    const intervalId = window.setInterval(
      () => void load(false, true),
      ADMIN_ORDERS_POLL_INTERVAL_MS,
    );
    const handleFocus = () => void load(false, true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load(false, true);
      }
    };
    const handleOrdersUpdated = () => void load(false, false);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(ADMIN_ORDERS_UPDATED_EVENT, handleOrdersUpdated);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(ADMIN_ORDERS_UPDATED_EVENT, handleOrdersUpdated);
    };
  }, []);

  useEffect(() => {
    const rawOrderId = searchParams.get("orderId");
    const nextOrderId = rawOrderId ? Number(rawOrderId) : NaN;

    if (!Number.isFinite(nextOrderId) || nextOrderId <= 0) {
      if (pendingOpenOrderIdRef.current !== null) {
        return;
      }

      const liveOrderId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("orderId")
          : null;
      const liveNextOrderId = liveOrderId ? Number(liveOrderId) : NaN;

      if (Number.isFinite(liveNextOrderId) && liveNextOrderId > 0) {
        return;
      }

      if (selectedOrderId !== null) {
        clearedOrderIdRef.current = selectedOrderId;
        setSelectedOrderId(null);
      }
      return;
    }

    pendingOpenOrderIdRef.current = null;

    if (clearedOrderIdRef.current === nextOrderId || selectedOrderId === nextOrderId) {
      return;
    }

    if (!orders.some((order) => order.id === nextOrderId)) {
      return;
    }

    setSelectedOrderId(nextOrderId);
    window.requestAnimationFrame(() => {
      detailTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [orders, searchParams, selectedOrderId]);

  const openOrderDetail = (orderId: number) => {
    clearedOrderIdRef.current = null;
    pendingOpenOrderIdRef.current = orderId;
    setSelectedOrderId(orderId);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("section", "admin-orders");
    nextParams.set("orderId", String(orderId));
    router.replace(`/account?${nextParams.toString()}`, { scroll: false });
    window.requestAnimationFrame(() => {
      detailTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const closeOrderDetail = () => {
    pendingOpenOrderIdRef.current = null;
    clearedOrderIdRef.current = selectedOrderId;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("section", "admin-orders");
    nextParams.delete("orderId");
    const queryString = nextParams.toString();
    router.replace(queryString ? `/account?${queryString}` : "/account?section=admin-orders", {
      scroll: false,
    });
    setSelectedOrderId(null);
  };

  const updateOrderStatus = async (order: CustomerOrder, status: string) => {
    try {
      setUpdatingOrderId(order.id);
      setError("");
      const updated = await api(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const merged = { ...order, ...updated };
      setOrders((current) =>
        current.map((entry) => (entry.id === order.id ? { ...entry, ...merged } : entry)),
      );
      window.dispatchEvent(new CustomEvent(ADMIN_ORDERS_UPDATED_EVENT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el pedido.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const orderMetrics = useMemo(() => buildOrderQueueMetrics(orders), [orders]);
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesOrderFilter(order, activeFilter) && orderMatchesQuery(order, query),
      ),
    [activeFilter, orders, query],
  );

  if (!loading && selectedOrderId) {
    return (
      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button type="button" onClick={closeOrderDetail} style={ghostButtonStyle}>
            Volver a pedidos
          </button>
        </div>
        <AdminOrderDetailPanel
          orderId={selectedOrderId}
          onBack={closeOrderDetail}
          showBackButton={false}
          onOrderUpdated={(updatedOrder) => {
            setOrders((current) =>
              current.map((order) =>
                order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order,
              ),
            );
          }}
        />
      </section>
    );
  }

  return (
    <section style={panelStyle}>
      <AdminHeader
        title="Pedidos"
        copy="Vista operativa para detectar prioridad, entrar al detalle y llevar cada orden por una secuencia clara de trabajo."
      />
      {error ? <p style={errorStyle}>{error}</p> : null}
      {loading ? (
        <AdminStateCard label="Cargando pedidos..." />
      ) : (
        <>
          <div style={orderQueueStatsStyle}>
            <AdminMetricCard label="Nuevos" value={orderMetrics.newOrders} />
            <AdminMetricCard label="Pago pendiente" value={orderMetrics.paymentPending} />
            <AdminMetricCard label="Para preparar" value={orderMetrics.toPrepare} />
            <AdminMetricCard label="Listos retiro" value={orderMetrics.readyForPickup} />
            <AdminMetricCard label="Alertas" value={orderMetrics.issues} />
          </div>

          <section style={orderQueueShellStyle}>
            <div style={orderToolbarStyle}>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <p style={eyebrowStyle}>Operacion diaria</p>
                <h3 style={{ ...title3Style, margin: 0 }}>Bandeja de pedidos</h3>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar pedido, cliente, telefono, email o seguimiento"
                style={orderSearchInputStyle}
              />
            </div>

            <div style={orderFilterRailStyle}>
              {orderQueueFilters.map((filter) => {
                const active = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    style={orderFilterButtonStyle(active)}
                  >
                    {filter.label}
                    <span style={orderFilterCountStyle(active)}>
                      {filter.count(orderMetrics)}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredOrders.length === 0 ? (
              <AdminStateCard label="No hay pedidos para los filtros seleccionados." />
            ) : (
              <div style={orderTableScrollStyle}>
                <div style={orderTableStyle}>
                  <div style={{ ...orderRowStyle, ...orderHeaderRowStyle }}>
                    <span>Pedido</span>
                    <span>Cliente</span>
                    <span>Pago</span>
                    <span>Entrega</span>
                    <span>Estado operativo</span>
                    <span>Total</span>
                    <span>Acciones</span>
                  </div>

                  {filteredOrders.map((order) => {
                    const units = order.items.reduce((total, item) => total + item.quantity, 0);
                    const issueLabels = orderIssueLabels(order);
                    const nextAction = getOrderQueueAction(order);
                    const updating = updatingOrderId === order.id;

                    return (
                      <article
                        key={order.id}
                        style={orderRowItemStyle(false)}
                        onClick={() => openOrderDetail(order.id)}
                      >
                        <div style={orderCellStackStyle}>
                          <strong style={{ color: "var(--account-text-strong)" }}>#{order.id}</strong>
                          <span style={metaStyle}>{new Date(order.createdAt).toLocaleString("es-AR")}</span>
                          {order.status === "pending" ? <span style={newOrderBadgeStyle}>Nuevo</span> : null}
                        </div>

                        <div style={orderCellStackStyle}>
                          <strong style={{ color: "var(--account-text-strong)" }}>{orderCustomerName(order)}</strong>
                          <span style={metaStyle}>{orderCustomerPhone(order)}</span>
                          <span style={metaStyle}>
                            {units} unidad{units === 1 ? "" : "es"} - {order.items.length} linea{order.items.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div style={orderCellStackStyle}>
                          <span style={statusChipStyle(primaryPaymentStatus(order))}>{primaryPaymentLabel(order)}</span>
                          <span style={metaStyle}>{primaryPaymentMethod(order)}</span>
                        </div>

                        <div style={orderCellStackStyle}>
                          <span style={softChipStyle}>{isPickupOrder(order) ? "Retiro" : "Envio"}</span>
                          <span style={metaStyle}>{orderDeliveryLabel(order)}</span>
                          {order.shipment?.trackingNumber ? <span style={metaStyle}>Seguimiento {order.shipment.trackingNumber}</span> : null}
                        </div>

                        <div style={orderCellStackStyle}>
                          <span style={statusChipStyle(order.status)}>{orderStatusLabelForDelivery(order)}</span>
                          {issueLabels.length > 0 ? (
                            <div style={orderIssueListStyle}>
                              {issueLabels.map((issue) => (
                                <span key={issue} style={orderIssueChipStyle}>{issue}</span>
                              ))}
                            </div>
                          ) : (
                            <span style={metaStyle}>Sin alertas</span>
                          )}
                        </div>

                        <div style={orderCellStackStyle}>
                          <strong style={{ color: "var(--account-text-strong)" }}>{money(order.total)}</strong>
                          <span style={metaStyle}>Envio {money(order.shippingCost)}</span>
                        </div>

                        <div style={orderActionCellStyle}>
                          {nextAction ? (
                            <button
                              type="button"
                              disabled={updating}
                              onClick={(event) => {
                                event.stopPropagation();
                                void updateOrderStatus(order, nextAction.nextStatus);
                              }}
                              style={orderPrimaryActionStyle}
                            >
                              {updating ? "Actualizando..." : nextAction.label}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openOrderDetail(order.id);
                            }}
                            style={ghostButtonStyle}
                          >
                            Ver detalle
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <div ref={detailTopRef} />
        </>
      )}
    </section>
  );
}
