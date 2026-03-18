"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  CustomerOrder,
  money,
  openReceipt,
  orderStatusLabel,
  shipmentTimeline,
} from "./order-utils";

export default function OrderDetailView({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);

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
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 32,
            color: "rgba(247,241,232,0.7)",
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
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 32,
            color: "rgba(247,241,232,0.7)",
          }}
        >
          No pudimos encontrar este pedido.
        </div>
      </section>
    );
  }

  const timeline = shipmentTimeline(order);

  return (
    <section
      style={{
        padding: "72px 20px 96px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), #0b0b0b",
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
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "#f7f1e8",
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
                background: "#f7f1e8",
                color: "#0b0b0b",
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
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
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
                    color: "rgba(247,241,232,0.48)",
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
                          background: step.done ? "#f7f1e8" : "rgba(255,255,255,0.2)",
                        }}
                      />
                      {index < timeline.length - 1 ? (
                        <div
                          style={{
                            width: 2,
                            minHeight: 34,
                            background: step.done
                              ? "rgba(247,241,232,0.5)"
                              : "rgba(255,255,255,0.12)",
                          }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <strong style={{ color: "#fff" }}>{step.label}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              style={{
                borderRadius: 32,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
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
                    color: "rgba(247,241,232,0.48)",
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
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(8,8,8,0.46)",
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 88,
                        aspectRatio: "4 / 5",
                        borderRadius: 18,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.06)",
                      }}
                    >
                      {item.variant.product.images?.[0]?.url ? (
                        <img
                          src={item.variant.product.images[0].url}
                          alt={item.variant.product.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <strong style={{ display: "block", color: "#fff", fontSize: 20 }}>
                        {item.variant.product.title}
                      </strong>
                      <span style={{ display: "block", marginTop: 8, color: "rgba(247,241,232,0.68)" }}>
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
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(243,238,231,0.14), rgba(255,255,255,0.04))",
                padding: 28,
                display: "grid",
                gap: 16,
              }}
            >
              <strong style={{ fontSize: 22 }}>Totales</strong>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "rgba(247,241,232,0.66)" }}>Subtotal</span>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "rgba(247,241,232,0.66)" }}>Envio</span>
                <strong>{money(order.shippingCost)}</strong>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span>Total</span>
                <strong style={{ fontSize: 28 }}>{money(order.total)}</strong>
              </div>
            </section>

            <section
              style={{
                borderRadius: 32,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                padding: 28,
                display: "grid",
                gap: 14,
              }}
            >
              <strong style={{ fontSize: 22 }}>Envio</strong>
              <p style={{ margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.8 }}>
                Metodo: {order.shippingProvider ?? "A confirmar"} {order.shippingMethod ? `· ${order.shippingMethod}` : ""}
                <br />
                Tracking: {order.shipment?.trackingNumber ?? "Sin asignar"}
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
                    background: "#f7f1e8",
                    color: "#0b0b0b",
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
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
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
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(8,8,8,0.42)",
                      padding: 16,
                    }}
                  >
                    <strong style={{ display: "block", color: "#fff" }}>
                      {payment.provider}
                    </strong>
                    <span style={{ display: "block", marginTop: 8, color: "rgba(247,241,232,0.68)" }}>
                      {payment.status} · {money(payment.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "rgba(247,241,232,0.68)" }}>
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
