"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  CustomerOrder,
  money,
  openReceipt,
  orderStatusLabel,
} from "./order-utils";

type OrdersSectionProps = {
  mode?: "preview" | "full";
};

export default function OrdersSection({ mode = "preview" }: OrdersSectionProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await api("/customers/me/orders");
        setOrders(data);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const visibleOrders = useMemo(() => {
    if (mode === "full") return orders;
    return orders.slice(0, 1);
  }, [mode, orders]);

  return (
    <section
      style={{
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        padding: 32,
        display: "grid",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.26em",
              fontSize: 12,
              color: "rgba(247,241,232,0.55)",
            }}
          >
            Mis compras
          </p>
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(1.8rem, 2vw, 2.4rem)",
              letterSpacing: "-0.04em",
            }}
          >
            {mode === "full" ? "Historial completo" : "Ultimo pedido"}
          </h2>
        </div>

        {mode === "preview" && orders.length > 0 ? (
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
            Mostrar historial completo
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div
          style={{
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 24,
            color: "rgba(247,241,232,0.66)",
          }}
        >
          Cargando compras...
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            borderRadius: 24,
            border: "1px dashed rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.02)",
            padding: 28,
            color: "rgba(247,241,232,0.68)",
            lineHeight: 1.7,
          }}
        >
          Todavia no tenes compras registradas. Cuando completes una orden, aca vas
          a poder ver el resumen, descargar el comprobante y seguir el envio.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {visibleOrders.map((order) => (
            <article
              key={order.id}
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(8,8,8,0.52)",
                padding: 24,
                display: "grid",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      fontSize: 11,
                      color: "rgba(247,241,232,0.48)",
                    }}
                  >
                    Pedido #{order.id}
                  </p>
                  <h3 style={{ margin: "10px 0 6px", fontSize: 24 }}>
                    {new Date(order.createdAt).toLocaleDateString("es-AR")}
                  </h3>
                  <p style={{ margin: 0, color: "rgba(247,241,232,0.68)" }}>
                    Estado: {orderStatusLabel(order.status)}
                  </p>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {money(order.total)}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {order.items.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "68px minmax(0, 1fr) auto",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 68,
                        aspectRatio: "4 / 5",
                        borderRadius: 16,
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
                      <strong style={{ display: "block", color: "#fff" }}>
                        {item.variant.product.title}
                      </strong>
                      <span style={{ color: "rgba(247,241,232,0.66)" }}>
                        x{item.quantity} {item.variant.Size ?? ""} {item.variant.Color ?? ""}
                      </span>
                    </div>
                    <strong>{money(item.price)}</strong>
                  </div>
                ))}
                {order.items.length > 2 ? (
                  <span style={{ color: "rgba(247,241,232,0.6)" }}>
                    +{order.items.length - 2} producto{order.items.length - 2 === 1 ? "" : "s"} mas
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "rgba(247,241,232,0.66)", lineHeight: 1.7 }}>
                  {order.shipment?.trackingNumber
                    ? `Tracking: ${order.shipment.trackingNumber}`
                    : "El envio todavia no tiene tracking asignado"}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={() => openReceipt(order.id)}
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      color: "#f7f1e8",
                      padding: "12px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Descargar comprobante
                  </button>
                  <Link
                    href={`/account/orders/${order.id}`}
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
                    Mostrar mas detalles
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
