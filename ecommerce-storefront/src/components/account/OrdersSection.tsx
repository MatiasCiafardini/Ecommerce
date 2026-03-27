"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
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
      data-account-panel
      style={{
        borderRadius: 32,
        border: "1px solid var(--border-soft)",
        background: "var(--page-panel-bg)",
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
              color: "var(--text-muted)",
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
              border: "1px solid var(--border-soft)",
              background: "transparent",
              color: "var(--text-strong)",
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
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: 24,
            color: "var(--text-muted)",
          }}
        >
          Cargando compras...
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            borderRadius: 24,
            border: "1px dashed var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: 28,
            color: "var(--text-muted)",
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
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-strong-bg)",
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
                      color: "var(--text-muted)",
                    }}
                  >
                    Pedido #{order.id}
                  </p>
                  <h3 style={{ margin: "10px 0 6px", fontSize: 24 }}>
                    {new Date(order.createdAt).toLocaleDateString("es-AR")}
                  </h3>
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>
                    Estado: {orderStatusLabel(order.status)}
                  </p>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid var(--border-soft)",
                    background: "var(--block-card-bg)",
                    color: "var(--text-strong)",
                    fontWeight: 700,
                  }}
                >
                  {money(order.total)}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {order.items.slice(0, 2).map((item) => (
                  <div
                    className="layout-review-item"
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
                          width={68}
                          height={85}
                          unoptimized
                          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center center", padding: 8 }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <strong style={{ display: "block", color: "var(--text-strong)" }}>
                        {item.variant.product.title}
                      </strong>
                      <span style={{ color: "var(--text-muted)" }}>
                        x{item.quantity} {item.variant.Size ?? ""} {item.variant.Color ?? ""}
                      </span>
                    </div>
                    <strong>{money(item.price)}</strong>
                  </div>
                ))}
                {order.items.length > 2 ? (
                  <span style={{ color: "var(--text-muted)" }}>
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
                <div style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
                  {order.shipment?.trackingNumber
                    ? `Tracking: ${order.shipment.trackingNumber}`
                    : "El envio todavia no tiene tracking asignado"}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={() => openReceipt(order.id)}
                    style={{
                      borderRadius: 999,
                      border: "1px solid var(--border-soft)",
                      background: "transparent",
                      color: "var(--text-strong)",
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
                      background: "var(--text-strong)",
                      color: "var(--page-panel-bg)",
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
