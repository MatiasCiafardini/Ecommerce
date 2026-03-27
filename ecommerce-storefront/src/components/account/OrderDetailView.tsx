"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import {
  canCustomerCancelOrder,
  canCustomerRequestCancellation,
  canCustomerRequestReturn,
  CustomerOrder,
  hasOrderShippingSnapshot,
  money,
  openReceipt,
  orderShippingAddressLines,
  orderShippingRecipient,
  orderStatusLabel,
  shipmentTimeline,
} from "./order-utils";

export default function OrderDetailView({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"cancel" | "return" | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await api(`/customers/me/orders/${orderId}`);
        setOrder(data);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <section style={{ padding: "72px 20px 96px" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            borderRadius: 32,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: 32,
            color: "var(--text-muted)",
          }}
        >
          Cargando pedido...
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section style={{ padding: "72px 20px 96px" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            borderRadius: 32,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: 32,
            color: "var(--text-muted)",
          }}
        >
          No pudimos encontrar este pedido.
        </div>
      </section>
    );
  }

  const timeline = shipmentTimeline(order);
  const shippingAddressLines = orderShippingAddressLines(order);
  const cancellable = canCustomerCancelOrder(order);
  const cancellationRequestable = canCustomerRequestCancellation(order);
  const returnable = canCustomerRequestReturn(order);
  const selectableItems = order.items.filter(
    (item) => Number(item.quantity ?? 0) - Number(item.returnedQuantity ?? 0) > 0,
  );

  const reloadOrder = async () => {
    const data = await api(`/customers/me/orders/${orderId}`);
    setOrder(data);
  };

  const handleCancelOrder = async () => {
    try {
      setActionLoading("cancel");
      setActionError("");
      setActionSuccess("");
      await api(`/customers/me/orders/${order.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await reloadOrder();
      setActionSuccess("El pedido se canceló correctamente.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo cancelar el pedido.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestReturn = async () => {
    try {
      const items = selectableItems
        .map((item) => ({
          orderItemId: item.id,
          quantity: Number(returnQuantities[item.id] ?? 0),
        }))
        .filter((item) => item.quantity > 0);

      if (items.length === 0) {
        setActionError("Elegí al menos un item y una cantidad para solicitar la devolución.");
        return;
      }

      setActionLoading("return");
      setActionError("");
      setActionSuccess("");

      await api("/returns", {
        method: "POST",
        body: JSON.stringify({
          orderId: order.id,
          reason: returnReason.trim() || undefined,
          items,
        }),
      });

      await reloadOrder();
      setReturnReason("");
      setReturnQuantities({});
      setActionSuccess("La solicitud de devolución quedó registrada.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo crear la devolución.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestCancellation = async () => {
    try {
      setActionLoading("cancel");
      setActionError("");
      setActionSuccess("");
      await api(`/customers/me/orders/${order.id}/cancellation-request`, {
        method: "POST",
        body: JSON.stringify({
          reason: cancellationReason.trim() || undefined,
        }),
      });
      await reloadOrder();
      setCancellationReason("");
      setActionSuccess("La solicitud de cancelación fue enviada para revisión.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo crear la solicitud de cancelación.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section
      style={{
        padding: "72px 20px 96px",
        background: "var(--account-shell-bg)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 12px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 12,
                color: "rgba(247,241,232,0.56)",
              }}
            >
              Pedido #{order.id}
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
              Detalle de compra
            </h1>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/account/orders"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "1px solid var(--border-soft)",
                background: "transparent",
                color: "var(--text-strong)",
                textDecoration: "none",
                padding: "12px 16px",
              }}
            >
              Volver al historial
            </Link>
            <button
              onClick={() => openReceipt(order.id)}
              style={{
                border: "none",
                borderRadius: 999,
                background: "var(--text-strong)",
                color: "var(--page-panel-bg)",
                padding: "12px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Descargar comprobante
            </button>
          </div>
        </div>

        <div className="layout-two-col">
          <div style={{ display: "grid", gap: 24 }}>
            <section
              style={{
                borderRadius: 32,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                padding: 28,
                display: "grid",
                gap: 18,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  Estado actual
                </p>
                <h2 style={{ margin: "10px 0 0", fontSize: 28 }}>
                  {orderStatusLabel(order.status)}
                </h2>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                {timeline.map((step, index) => (
                  <div
                    key={step.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px minmax(0, 1fr)",
                      gap: 14,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        display: "grid",
                        justifyItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: step.done ? "var(--text-strong)" : "var(--border-soft)",
                        }}
                      />
                      {index < timeline.length - 1 ? (
                        <div
                          style={{
                            width: 2,
                            minHeight: 34,
                            background: step.done ? "var(--border-strong)" : "var(--border-soft)",
                          }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <strong style={{ color: "var(--text-strong)" }}>{step.label}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {(cancellable || cancellationRequestable || returnable || (order.returns?.length ?? 0) > 0 || (order.cancellationRequests?.length ?? 0) > 0) ? (
              <section
                style={{
                  borderRadius: 32,
                  border: "1px solid var(--border-soft)",
                  background: "var(--page-panel-bg)",
                  padding: 28,
                  display: "grid",
                  gap: 18,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.22em",
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    Postventa
                  </p>
                  <h2 style={{ margin: "10px 0 0", fontSize: 28 }}>Cambios sobre este pedido</h2>
                </div>

                {actionError ? <p style={{ margin: 0, color: "var(--accent-strong)" }}>{actionError}</p> : null}
                {actionSuccess ? <p style={{ margin: 0, color: "var(--accent)" }}>{actionSuccess}</p> : null}

                {cancellable ? (
                  <div
                    style={{
                      borderRadius: 24,
                      border: "1px solid var(--border-soft)",
                      background: "var(--page-panel-strong-bg)",
                      padding: 18,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <strong style={{ fontSize: 20 }}>Cancelar pedido</strong>
                    <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7 }}>
                      Todavía estamos a tiempo de frenarlo porque no entró en una etapa irreversible
                      de operación.
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => void handleCancelOrder()}
                        disabled={actionLoading !== null}
                        style={{
                          border: "1px solid var(--border-soft)",
                          borderRadius: 999,
                          background: "transparent",
                          color: "var(--text-strong)",
                          padding: "12px 16px",
                          cursor: "pointer",
                        }}
                      >
                        {actionLoading === "cancel" ? "Cancelando..." : "Cancelar pedido"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {cancellationRequestable ? (
                  <div
                    style={{
                      borderRadius: 24,
                      border: "1px solid var(--border-soft)",
                      background: "var(--page-panel-strong-bg)",
                      padding: 18,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <strong style={{ fontSize: 20 }}>Solicitar cancelación</strong>
                    <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7 }}>
                      Como el pedido ya avanzó después del pago, lo revisará el equipo antes de
                      confirmar la cancelación y el posible reintegro.
                    </p>
                    <textarea
                      value={cancellationReason}
                      onChange={(event) => setCancellationReason(event.target.value)}
                      placeholder="Contanos por qué querés cancelar este pedido"
                      style={{
                        width: "100%",
                        minHeight: 92,
                        padding: "14px 16px",
                        borderRadius: 18,
                        border: "1px solid var(--border-soft)",
                        background: "var(--muted-field-bg)",
                        color: "var(--muted-field-color)",
                        resize: "vertical",
                      }}
                    />
                    <div>
                      <button
                        type="button"
                        onClick={() => void handleRequestCancellation()}
                        disabled={actionLoading !== null}
                        style={{
                          border: "1px solid var(--border-soft)",
                          borderRadius: 999,
                          background: "transparent",
                          color: "var(--text-strong)",
                          padding: "12px 16px",
                          cursor: "pointer",
                        }}
                      >
                        {actionLoading === "cancel" ? "Enviando..." : "Enviar ticket de cancelación"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {returnable ? (
                  <div
                    style={{
                      borderRadius: 24,
                      border: "1px solid var(--border-soft)",
                      background: "var(--page-panel-strong-bg)",
                      padding: 18,
                      display: "grid",
                      gap: 14,
                    }}
                  >
                    <strong style={{ fontSize: 20 }}>Solicitar devolución</strong>
                    <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7 }}>
                      Elegí los items y cantidades que querés devolver. El equipo lo revisará desde
                      administración antes de aprobarlo.
                    </p>

                    <div style={{ display: "grid", gap: 12 }}>
                      {selectableItems.map((item) => {
                        const availableQuantity =
                          Number(item.quantity ?? 0) - Number(item.returnedQuantity ?? 0);

                        return (
                          <div
                            key={`return-item-${item.id}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) 120px",
                              gap: 12,
                              alignItems: "center",
                              padding: 14,
                              borderRadius: 18,
                              border: "1px solid var(--border-soft)",
                              background: "var(--page-panel-bg)",
                            }}
                          >
                            <div>
                              <strong style={{ display: "block", color: "var(--text-strong)" }}>
                                {item.variant.product.title}
                              </strong>
                              <span style={{ color: "var(--text-muted)" }}>
                                Disponible para devolver: {availableQuantity}
                              </span>
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={availableQuantity}
                              value={returnQuantities[item.id] ?? ""}
                              onChange={(event) =>
                                setReturnQuantities((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                padding: "12px 14px",
                                borderRadius: 14,
                                border: "1px solid var(--border-soft)",
                                background: "var(--muted-field-bg)",
                                color: "var(--muted-field-color)",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <textarea
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      placeholder="Contanos brevemente el motivo de la devolución"
                      style={{
                        width: "100%",
                        minHeight: 100,
                        padding: "14px 16px",
                        borderRadius: 18,
                        border: "1px solid var(--border-soft)",
                        background: "var(--muted-field-bg)",
                        color: "var(--muted-field-color)",
                        resize: "vertical",
                      }}
                    />

                    <div>
                      <button
                        type="button"
                        onClick={() => void handleRequestReturn()}
                        disabled={actionLoading !== null}
                        style={{
                          border: "none",
                          borderRadius: 999,
                          background: "var(--text-strong)",
                          color: "var(--page-panel-bg)",
                          padding: "12px 16px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {actionLoading === "return" ? "Enviando..." : "Enviar solicitud"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {order.returns?.length ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <strong style={{ fontSize: 20 }}>Historial de devoluciones</strong>
                    {order.returns.map((entry) => (
                      <div
                        key={`return-${entry.id}`}
                        style={{
                          borderRadius: 20,
                          border: "1px solid var(--border-soft)",
                          background: "var(--page-panel-strong-bg)",
                          padding: 16,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <strong style={{ color: "var(--text-strong)" }}>
                          Solicitud #{entry.id} · {entry.status}
                        </strong>
                        {entry.reason ? (
                          <span style={{ color: "var(--text-muted)" }}>{entry.reason}</span>
                        ) : null}
                        <span style={{ color: "var(--text-muted)" }}>
                          {new Date(entry.createdAt).toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {order.cancellationRequests?.length ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <strong style={{ fontSize: 20 }}>Solicitudes de cancelación</strong>
                    {order.cancellationRequests.map((entry) => (
                      <div
                        key={`cancellation-${entry.id}`}
                        style={{
                          borderRadius: 20,
                          border: "1px solid var(--border-soft)",
                          background: "var(--page-panel-strong-bg)",
                          padding: 16,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <strong style={{ color: "var(--text-strong)" }}>
                          Ticket #{entry.id} · {entry.status}
                        </strong>
                        {entry.reason ? (
                          <span style={{ color: "var(--text-muted)" }}>{entry.reason}</span>
                        ) : null}
                        {entry.adminNotes ? (
                          <span style={{ color: "var(--text-muted)" }}>
                            Nota admin: {entry.adminNotes}
                          </span>
                        ) : null}
                        <span style={{ color: "var(--text-muted)" }}>
                          {new Date(entry.createdAt).toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section
              style={{
                borderRadius: 32,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                padding: 28,
                display: "grid",
                gap: 18,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  Lo que compraste
                </p>
                <h2 style={{ margin: "10px 0 0", fontSize: 28 }}>Resumen del pedido</h2>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {order.items.map((item) => (
                  <article
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "88px minmax(0, 1fr) auto",
                      gap: 16,
                      alignItems: "center",
                      borderRadius: 24,
                      border: "1px solid var(--border-soft)",
                      background: "var(--page-panel-strong-bg)",
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 88,
                        aspectRatio: "4 / 5",
                        borderRadius: 18,
                        overflow: "hidden",
                        background: "var(--product-media-fallback)",
                      }}
                    >
                      {item.variant.product.images?.[0]?.url ? (
                        <Image
                          src={
                            resolveAssetUrl(item.variant.product.images[0].url) ??
                            item.variant.product.images[0].url
                          }
                          alt={item.variant.product.title}
                          width={88}
                          height={110}
                          unoptimized
                          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center center", padding: 10 }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-strong)", fontSize: 20 }}>
                        {item.variant.product.title}
                      </strong>
                      <span style={{ display: "block", marginTop: 8, color: "var(--text-muted)" }}>
                        x{item.quantity} · {item.variant.Size ?? "UN"} · {item.variant.Color ?? "Sin color"}
                      </span>
                    </div>
                    <strong>{money(item.price)}</strong>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="layout-sidebar" style={{ display: "grid", gap: 24 }}>
            <section
              style={{
                borderRadius: 32,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                padding: 28,
                display: "grid",
                gap: 16,
              }}
            >
              <strong style={{ fontSize: 22 }}>Totales</strong>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--text-muted)" }}>Envio</span>
                <strong>{money(order.shippingCost)}</strong>
              </div>
              <div style={{ height: 1, background: "var(--border-soft)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span>Total</span>
                <strong style={{ fontSize: 28 }}>{money(order.total)}</strong>
              </div>
            </section>

            <section
              style={{
                borderRadius: 32,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                padding: 28,
                display: "grid",
                gap: 14,
              }}
            >
              <strong style={{ fontSize: 22 }}>Envio</strong>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.8 }}>
                Metodo: {order.shippingProvider ?? "A confirmar"} {order.shippingMethod ? `· ${order.shippingMethod}` : ""}
                <br />
                Tracking: {order.shipment?.trackingNumber ?? "Sin asignar"}
                {hasOrderShippingSnapshot(order) ? (
                  <>
                    <br />
                    Destinatario: {orderShippingRecipient(order)}
                    <br />
                    {shippingAddressLines.join(" · ")}
                  </>
                ) : null}
              </p>
              {order.shipment?.trackingUrl ? (
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    background: "var(--text-strong)",
                    color: "var(--page-panel-bg)",
                    textDecoration: "none",
                    padding: "12px 16px",
                    fontWeight: 700,
                  }}
                >
                  Seguir envio
                </a>
              ) : null}
            </section>

            <section
              style={{
                borderRadius: 32,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                padding: 28,
                display: "grid",
                gap: 14,
              }}
            >
              <strong style={{ fontSize: 22 }}>Pagos</strong>
              {order.payments?.length ? (
                order.payments.map((payment) => (
                  <div
                    key={payment.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid var(--border-soft)",
                      background: "var(--page-panel-strong-bg)",
                      padding: 16,
                    }}
                  >
                    <strong style={{ display: "block", color: "var(--text-strong)" }}>
                      {payment.provider}
                      {payment.method ? ` · ${payment.method}` : ""}
                    </strong>
                    <span style={{ display: "block", marginTop: 8, color: "var(--text-muted)" }}>
                      {payment.status} · {money(payment.amount)}
                    </span>
                    {payment.reference ? (
                      <span style={{ display: "block", marginTop: 8, color: "var(--text-muted)" }}>
                        Referencia: {payment.reference}
                      </span>
                    ) : null}
                    {payment.proofUrl ? (
                      <a
                        href={payment.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 12,
                          borderRadius: 999,
                          border: "1px solid var(--border-soft)",
                          background: "transparent",
                          color: "var(--text-strong)",
                          textDecoration: "none",
                          padding: "10px 14px",
                        }}
                      >
                        Ver comprobante
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  No hay pagos registrados todavía.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

