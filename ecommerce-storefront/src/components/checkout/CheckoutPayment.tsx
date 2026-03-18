"use client";

import { useState } from "react";

type ShippingOption = {
  provider: string;
  method: string;
  price: number;
  estimatedDays: number;
};

export default function CheckoutPayment({
  shippingOptions,
  onNext,
}: {
  shippingOptions: ShippingOption[];
  onNext: (payload: {
    paymentMethod: string;
    shippingOption: ShippingOption;
  }) => void;
}) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(
    shippingOptions[0] ?? null,
  );

  return (
    <section
      className="layout-two-col"
      style={{
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
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
            Envio
          </p>
          <h2 style={{ margin: "12px 0 0", fontSize: "clamp(2rem, 3vw, 3rem)" }}>
            Elegi el ritmo de entrega
          </h2>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {shippingOptions.map((option) => {
            const active =
              selectedShipping?.provider === option.provider &&
              selectedShipping?.method === option.method;

            return (
              <button
                key={`${option.provider}-${option.method}`}
                onClick={() => setSelectedShipping(option)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 24,
                  border: active
                    ? "1px solid rgba(255,255,255,0.22)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(255,255,255,0.08)" : "rgba(8,8,8,0.5)",
                  color: "#f7f1e8",
                  padding: 22,
                  cursor: "pointer",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    fontSize: 11,
                    color: active ? "rgba(247,241,232,0.72)" : "rgba(247,241,232,0.46)",
                  }}
                >
                  {option.provider}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "end",
                    marginTop: 10,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 22 }}>{option.method}</h3>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "rgba(247,241,232,0.66)",
                      }}
                    >
                      Llega en {option.estimatedDays} dia
                      {option.estimatedDays === 1 ? "" : "s"}
                    </p>
                  </div>
                  <strong style={{ fontSize: 24 }}>${option.price}</strong>
                </div>
              </button>
            );
          })}
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
            Pago
          </p>
          <h3 style={{ margin: "12px 0 0", fontSize: 28 }}>
            Defini como queres cerrar
          </h3>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {[
            {
              id: "card",
              title: "Tarjeta",
              description: "Aprueba al instante para simular una compra completa.",
            },
            {
              id: "cash",
              title: "Efectivo",
              description: "Genera la orden y la deja pendiente de pago.",
            },
          ].map((method) => {
            const active = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 22,
                  border: active
                    ? "1px solid rgba(255,255,255,0.22)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(255,255,255,0.08)" : "rgba(8,8,8,0.5)",
                  color: "#f7f1e8",
                  padding: 20,
                  cursor: "pointer",
                }}
              >
                <strong style={{ display: "block", fontSize: 20 }}>{method.title}</strong>
                <span
                  style={{
                    display: "block",
                    marginTop: 8,
                    color: "rgba(247,241,232,0.66)",
                    lineHeight: 1.7,
                  }}
                >
                  {method.description}
                </span>
              </button>
            );
          })}
        </div>

        <button
          disabled={!selectedMethod || !selectedShipping}
          onClick={() =>
            selectedMethod &&
            selectedShipping &&
            onNext({
              paymentMethod: selectedMethod,
              shippingOption: selectedShipping,
            })
          }
          style={{
            border: "none",
            borderRadius: 999,
            background:
              selectedMethod && selectedShipping ? "#f7f1e8" : "rgba(255,255,255,0.12)",
            color:
              selectedMethod && selectedShipping ? "#0b0b0b" : "rgba(247,241,232,0.56)",
            padding: "15px 18px",
            fontWeight: 700,
            cursor: selectedMethod && selectedShipping ? "pointer" : "not-allowed",
          }}
        >
          Continuar a revision
        </button>
      </aside>
    </section>
  );
}
