"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  CustomerOrder,
  hasOrderShippingSnapshot,
  money,
  openReceipt,
  orderShippingAddressLines,
  orderShippingRecipient,
  orderStatusLabel,
} from "./order-utils";

export default function OrderReceiptView({ orderId }: { orderId: number }) {
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
    return <div style={{ padding: 32 }}>Cargando comprobante...</div>;
  }

  if (!order) {
    return <div style={{ padding: 32 }}>No se pudo cargar el comprobante.</div>;
  }

  const shippingAddressLines = orderShippingAddressLines(order);

  return (
    <>
      <style>{`
        @media print {
          .receipt-actions {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #111111 !important;
          }
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "#f4efe7",
          padding: "32px 20px",
          color: "#111111",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 18 }}>
          <div
            className="receipt-actions"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => void openReceipt(order.id)}
              style={{
                border: "none",
                borderRadius: 999,
                background: "#111111",
                color: "#f4efe7",
                padding: "12px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Descargar PDF
            </button>

            <button
              onClick={() => window.close()}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(17,17,17,0.14)",
                background: "transparent",
                color: "#111111",
                padding: "12px 16px",
                cursor: "pointer",
              }}
            >
              Cerrar ventana
            </button>
          </div>

          <section
            style={{
              borderRadius: 28,
              border: "1px solid rgba(17,17,17,0.08)",
              background: "#ffffff",
              padding: 36,
              display: "grid",
              gap: 28,
              boxShadow: "0 24px 60px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.24em",
                    fontSize: 12,
                    color: "rgba(17,17,17,0.56)",
                  }}
                >
                  Asphalt
                </p>
                <h1
                  style={{
                    margin: "10px 0 0",
                    fontSize: "clamp(2rem, 4vw, 3.6rem)",
                    lineHeight: 0.95,
                    letterSpacing: "-0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Comprobante de compra
                </h1>
              </div>

              <div style={{ minWidth: 220, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "rgba(17,17,17,0.58)" }}>Pedido</span>
                  <strong>#{order.id}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "rgba(17,17,17,0.58)" }}>Fecha</span>
                  <strong>{new Date(order.createdAt).toLocaleDateString("es-AR")}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ color: "rgba(17,17,17,0.58)" }}>Estado</span>
                  <strong>{orderStatusLabel(order.status)}</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 18,
              }}
            >
              <section
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(17,17,17,0.08)",
                  background: "#faf7f2",
                  padding: 20,
                  display: "grid",
                  gap: 10,
                }}
              >
                <strong>Entrega</strong>
                <p style={{ margin: 0, color: "rgba(17,17,17,0.72)", lineHeight: 1.7 }}>
                  {order.shippingProvider ?? "Proveedor a confirmar"}
                  {order.shippingMethod ? ` · ${order.shippingMethod}` : ""}
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
              </section>

              <section
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(17,17,17,0.08)",
                  background: "#faf7f2",
                  padding: 20,
                  display: "grid",
                  gap: 10,
                }}
              >
                <strong>Pago</strong>
                {order.payments?.length ? (
                  <p style={{ margin: 0, color: "rgba(17,17,17,0.72)", lineHeight: 1.7 }}>
                    {order.payments[0].provider} · {order.payments[0].status}
                    <br />
                    {money(order.payments[0].amount)}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "rgba(17,17,17,0.72)" }}>
                    Pago pendiente o sin registrar.
                  </p>
                )}
              </section>
            </div>

            <section style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.4fr) 90px 110px",
                  gap: 14,
                  paddingBottom: 10,
                  borderBottom: "1px solid rgba(17,17,17,0.08)",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: 11,
                  color: "rgba(17,17,17,0.54)",
                }}
              >
                <span>Producto</span>
                <span>Cantidad</span>
                <span style={{ textAlign: "right" }}>Precio</span>
              </div>

              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.4fr) 90px 110px",
                    gap: 14,
                    alignItems: "center",
                    paddingBottom: 12,
                    borderBottom: "1px solid rgba(17,17,17,0.06)",
                  }}
                >
                  <div>
                    <strong style={{ display: "block" }}>{item.variant.product.title}</strong>
                    <span style={{ color: "rgba(17,17,17,0.62)" }}>
                      {item.variant.Size ?? "UN"} · {item.variant.Color ?? "Sin color"}
                    </span>
                  </div>
                  <span>{item.quantity}</span>
                  <strong style={{ textAlign: "right" }}>{money(item.price)}</strong>
                </div>
              ))}
            </section>

            <div
              style={{
                marginLeft: "auto",
                width: "min(100%, 320px)",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "rgba(17,17,17,0.58)" }}>Subtotal</span>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "rgba(17,17,17,0.58)" }}>Envio</span>
                <strong>{money(order.shippingCost)}</strong>
              </div>
              <div style={{ height: 1, background: "rgba(17,17,17,0.08)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span>Total</span>
                <strong style={{ fontSize: 28 }}>{money(order.total)}</strong>
              </div>
            </div>

            <footer
              style={{
                paddingTop: 16,
                borderTop: "1px solid rgba(17,17,17,0.08)",
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                color: "rgba(17,17,17,0.58)",
                fontSize: 13,
              }}
            >
              <span>Gracias por comprar en Asphalt.</span>
              <span>Comprobante generado desde tu cuenta.</span>
            </footer>
          </section>
        </div>
      </main>
    </>
  );
}

