"use client";

import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  CustomerOrder,
  money,
  openReceipt,
} from "@/components/account/order-utils";

type ShippingOption = {
  provider: string;
  method: string;
  price: number;
  estimatedDays: number;
};

export default function CheckoutReview({
  cart,
  cartId,
  address,
  paymentMethod,
  shippingOption,
}: {
  cart: any[];
  cartId: number;
  address: any;
  paymentMethod: string | null;
  shippingOption: ShippingOption | null;
}) {
  const { clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CustomerOrder | null>(null);

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const shippingCost = shippingOption?.price ?? 0;
  const total = subtotal + shippingCost;

  const handleConfirm = async () => {
    if (!user || !paymentMethod || !shippingOption) return;

    try {
      setLoading(true);

      const order = await api(`/store/checkout/${cartId}`, {
        method: "POST",
        body: JSON.stringify({
          customerId: user.id,
          shippingProvider: shippingOption.provider,
          shippingMethod: shippingOption.method,
          shippingCost: shippingOption.price,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      if (paymentMethod === "card") {
        await api(`/store/payments/${order.id}`, {
          method: "POST",
          body: JSON.stringify({
            token: "test-token",
            paymentMethodId: "visa",
            installments: 1,
            issuerId: "test",
            idempotencyKey: crypto.randomUUID(),
          }),
        });
      }

      const completed = await api(`/customers/me/orders/${order.id}`);
      setCompletedOrder(completed);
      clearCart();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "No se pudo completar la compra",
      );
    } finally {
      setLoading(false);
    }
  };

  if (completedOrder) {
    return (
      <section
        className="layout-two-col"
        style={{ gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)" }}
      >
        <div
          style={{
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(243,238,231,0.14), rgba(255,255,255,0.04))",
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
                letterSpacing: "0.24em",
                fontSize: 12,
                color: "rgba(247,241,232,0.52)",
              }}
            >
              Compra confirmada
            </p>
            <h2 style={{ margin: "12px 0 0", fontSize: "clamp(2rem, 3vw, 3rem)" }}>
              Se ha completado tu compra
            </h2>
            <p style={{ margin: "14px 0 0", color: "rgba(247,241,232,0.72)", lineHeight: 1.8 }}>
              Tu pedido #{completedOrder.id} ya quedó registrado. Desde acá podés
              descargar el comprobante, revisar todo lo comprado y seguir el envío
              desde tu cuenta.
            </p>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {completedOrder.items.map((item) => (
              <article
                key={item.id}
                className="layout-review-item"
                style={{
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
                  <strong style={{ display: "block", color: "#fff" }}>
                    {item.variant.product.title}
                  </strong>
                  <span style={{ color: "rgba(247,241,232,0.68)" }}>
                    x{item.quantity} {item.variant.Size ?? ""} {item.variant.Color ?? ""}
                  </span>
                </div>
                <strong>{money(item.price)}</strong>
              </article>
            ))}
          </div>
        </div>

        <aside
          style={{
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
            padding: 28,
            display: "grid",
            gap: 16,
          }}
        >
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(8,8,8,0.5)",
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <strong>Resumen</strong>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "rgba(247,241,232,0.66)" }}>Subtotal</span>
              <strong>{money(completedOrder.subtotal)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "rgba(247,241,232,0.66)" }}>Envio</span>
              <strong>{money(completedOrder.shippingCost)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span>Total</span>
              <strong style={{ fontSize: 28 }}>{money(completedOrder.total)}</strong>
            </div>
          </div>

          <button
            onClick={() => openReceipt(completedOrder.id)}
            style={{
              border: "none",
              borderRadius: 999,
              background: "#f7f1e8",
              color: "#0b0b0b",
              padding: "15px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Descargar comprobante
          </button>

          <button
            onClick={() => router.push(`/account/orders/${completedOrder.id}`)}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "#f7f1e8",
              padding: "15px 18px",
              cursor: "pointer",
            }}
          >
            Ver todo lo que compraste
          </button>

          <button
            onClick={() =>
              completedOrder.shipment?.trackingUrl
                ? window.open(completedOrder.shipment.trackingUrl, "_blank", "noopener,noreferrer")
                : router.push(`/account/orders/${completedOrder.id}`)
            }
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.06)",
              color: "#f7f1e8",
              padding: "15px 18px",
              cursor: "pointer",
            }}
          >
            Seguir envio
          </button>
        </aside>
      </section>
    );
  }

  return (
    <section
      className="layout-two-col"
      style={{
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
      }}
    >
      <div
        style={{
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
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
              letterSpacing: "0.24em",
              fontSize: 12,
              color: "rgba(247,241,232,0.52)",
            }}
          >
            Revision final
          </p>
          <h2 style={{ margin: "12px 0 0", fontSize: "clamp(2rem, 3vw, 3rem)" }}>
            Todo listo para salir
          </h2>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {cart.map((item, index) => (
            <article
              key={item.variantId}
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(8,8,8,0.5)",
                padding: 20,
              }}
              className="layout-review-item"
            >
              <div
                style={{
                  width: 88,
                  aspectRatio: "4 / 5",
                  borderRadius: 18,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(247,241,232,0.5)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Fit {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 22 }}>{item.name}</strong>
                <span
                  style={{
                    display: "block",
                    marginTop: 8,
                    color: "rgba(247,241,232,0.66)",
                  }}
                >
                  {item.quantity} unidad{item.quantity === 1 ? "" : "es"}
                </span>
              </div>
              <strong style={{ fontSize: 22 }}>${item.price * item.quantity}</strong>
            </article>
          ))}
        </div>
      </div>

      <aside
        style={{
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(243,238,231,0.14), rgba(255,255,255,0.04))",
          padding: 28,
          display: "grid",
          gap: 18,
          alignSelf: "start",
        }}
      >
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(8,8,8,0.5)",
            padding: 20,
            display: "grid",
            gap: 12,
          }}
        >
          <strong style={{ fontSize: 18 }}>Direccion</strong>
          <p style={{ margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.7 }}>
            {address?.firstName} {address?.lastName}
            <br />
            {address?.address1}
            <br />
            {address?.city}, {address?.country}
            <br />
            CP {address?.zip}
          </p>
        </div>

        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(8,8,8,0.5)",
            padding: 20,
            display: "grid",
            gap: 12,
          }}
        >
          <strong style={{ fontSize: 18 }}>Envio y pago</strong>
          <p style={{ margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.7 }}>
            {shippingOption?.provider} · {shippingOption?.method}
            <br />
            {paymentMethod === "card" ? "Tarjeta" : "Efectivo"}
          </p>
        </div>

        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(8,8,8,0.5)",
            padding: 20,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "rgba(247,241,232,0.66)" }}>Subtotal</span>
            <strong>${subtotal}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "rgba(247,241,232,0.66)" }}>Envio</span>
            <strong>${shippingCost}</strong>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span>Total</span>
            <strong style={{ fontSize: 28 }}>${total}</strong>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            border: "none",
            borderRadius: 999,
            background: "#f7f1e8",
            color: "#0b0b0b",
            padding: "15px 18px",
            fontWeight: 700,
            cursor: loading ? "progress" : "pointer",
          }}
        >
          {loading ? "Procesando compra..." : "Confirmar compra"}
        </button>
      </aside>
    </section>
  );
}
