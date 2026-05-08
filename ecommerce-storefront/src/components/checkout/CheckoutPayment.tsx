"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

type ShippingOption = {
  quoteId?: string;
  provider: string;
  method: string;
  price: number;
  estimatedDays: number;
  carrierId?: string;
  carrierName?: string;
  serviceCode?: string;
  modalityCode?: string;
  dispatchType?: string;
  branchId?: string | null;
  sellerCost?: number | null;
};

type PaymentOption = {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
};

const paymentOptions: PaymentOption[] = [
  {
    id: "cash",
    title: "Efectivo al retirar",
    description: "Reserva el pedido ahora y pagalo cuando pases a buscarlo por la tienda.",
    eyebrow: "Pickup",
  },
  {
    id: "mercadopago",
    title: "Mercado Pago",
    description: "Tarjetas, debito y saldo online. Ideal para aprobar la compra al instante.",
    eyebrow: "Online",
  },
  {
    id: "bank_transfer",
    title: "Transferencia bancaria",
    description: "Genera el pedido y sube el comprobante para que el comercio lo valide.",
    eyebrow: "Manual",
  },
];

const getShippingBadge = (option: ShippingOption) => {
  const method = option.method?.trim().toLowerCase() ?? "";
  const serviceCode = option.serviceCode?.trim().toLowerCase() ?? "";
  const modalityCode = option.modalityCode?.trim().toLowerCase() ?? "";
  const dispatchType = option.dispatchType?.trim().toLowerCase() ?? "";

  if (
    method.includes("retiro") ||
    method.includes("pickup") ||
    serviceCode === "pickup" ||
    modalityCode === "pickup" ||
    dispatchType === "pickup"
  ) {
    return "Retiro en local";
  }

  return "Envio por correo";
};

const isPickupShipping = (option: ShippingOption | null) => {
  const method = option?.method?.trim().toLowerCase() ?? "";
  const serviceCode = option?.serviceCode?.trim().toLowerCase() ?? "";
  const modalityCode = option?.modalityCode?.trim().toLowerCase() ?? "";
  const dispatchType = option?.dispatchType?.trim().toLowerCase() ?? "";

  return (
    method.includes("retiro") ||
    method.includes("pickup") ||
    serviceCode === "pickup" ||
    modalityCode === "pickup" ||
    dispatchType === "pickup"
  );
};

const getShippingTimingCopy = (option: ShippingOption) => {
  const provider = option.provider?.trim().toLowerCase() ?? "";
  const method = option.method?.trim().toLowerCase() ?? "";

  if (method.includes("retiro") || method.includes("pickup")) {
    return "Te avisaremos cuando este listo para retirar.";
  }

  if (method.includes("coordinar")) {
    return "Coordinaremos la fecha de entrega despues de la compra.";
  }

  if (provider === "manual" || provider === "store" || option.estimatedDays <= 0) {
    return "La fecha estimada se actualizara despues de la compra.";
  }

  return `Llega en ${option.estimatedDays} dia${option.estimatedDays === 1 ? "" : "s"}`;
};

export default function CheckoutPayment({
  shippingOptions,
  onNext,
}: {
  shippingOptions: ShippingOption[];
  onNext: (payload: {
    paymentMethod: string;
    paymentLabel: string;
    shippingOption: ShippingOption;
  }) => void;
}) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentOption | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(
    shippingOptions[0] ?? null,
  );
  const [bankTransferDiscountPercentage, setBankTransferDiscountPercentage] = useState(0);
  const [mercadoPagoEnabled, setMercadoPagoEnabled] = useState(false);
  const [bankTransferEnabled, setBankTransferEnabled] = useState(true);

  useEffect(() => {
    let active = true;

    void api("/store/payment-config")
      .then((config) => {
        if (!active) {
          return;
        }

        setBankTransferDiscountPercentage(
          Number(config?.bankTransfer?.discountPercentage ?? 0),
        );
        setMercadoPagoEnabled(Boolean(config?.mercadopago?.enabled));
        setBankTransferEnabled(config?.bankTransfer?.enabled !== false);
      })
      .catch(() => {
        if (active) {
          setBankTransferDiscountPercentage(0);
          setMercadoPagoEnabled(false);
          setBankTransferEnabled(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const availablePaymentOptions = paymentOptions.filter((option) => {
    if (option.id === "cash") {
      return isPickupShipping(selectedShipping);
    }

    if (option.id === "mercadopago") {
      return mercadoPagoEnabled;
    }

    if (option.id === "bank_transfer") {
      return bankTransferEnabled;
    }

    return true;
  });
  const selectedMethodAvailable = selectedMethod
    ? availablePaymentOptions.some((option) => option.id === selectedMethod.id)
    : false;
  const effectiveSelectedMethod = selectedMethodAvailable ? selectedMethod : null;

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
          border: "1px solid var(--checkout-border)",
          background: "var(--checkout-panel-bg)",
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
              color: "var(--checkout-text-muted)",
            }}
          >
            Envio
          </p>
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(2rem, 3vw, 3rem)",
              color: "var(--checkout-text-strong)",
            }}
          >
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
                className="checkout-select-card"
                data-active={active ? "true" : "false"}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 24,
                  border: active
                    ? "1px solid var(--checkout-border-strong)"
                    : "1px solid var(--checkout-border)",
                  background: active
                    ? "var(--checkout-card-alt-bg)"
                    : "var(--checkout-card-bg)",
                  color: "var(--checkout-text-strong)",
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
                    color: active
                      ? "var(--checkout-text-strong)"
                      : "var(--checkout-text-muted)",
                  }}
                >
                  {getShippingBadge(option)}
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
                        color: "var(--checkout-text-muted)",
                      }}
                    >
                      {getShippingTimingCopy(option)}
                    </p>
                  </div>
                  <strong style={{ fontSize: 24 }}>
                    {option.price <= 0 ? "Gratis" : formatCurrency(option.price)}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside
        style={{
          borderRadius: 32,
          border: "1px solid var(--checkout-border)",
          background: "var(--checkout-panel-bg)",
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
              color: "var(--checkout-text-muted)",
            }}
          >
            Pago
          </p>
          <h3 style={{ margin: "12px 0 0", fontSize: 28, color: "var(--checkout-text-strong)" }}>
            Defini como queres cerrar
          </h3>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {availablePaymentOptions.map((method) => {
            const active = effectiveSelectedMethod?.id === method.id;
            const hasTransferDiscount =
              method.id === "bank_transfer" && bankTransferDiscountPercentage > 0;

            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                className="checkout-select-card"
                data-active={active ? "true" : "false"}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 22,
                  border: active
                    ? "1px solid var(--checkout-border-strong)"
                    : "1px solid var(--checkout-border)",
                  background: active
                    ? "var(--checkout-card-alt-bg)"
                    : "var(--checkout-card-bg)",
                  color: "var(--checkout-text-strong)",
                  padding: 20,
                  cursor: "pointer",
                  display: "grid",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    fontSize: 11,
                    color: active
                      ? "var(--checkout-text-strong)"
                      : "var(--checkout-text-muted)",
                  }}
                >
                  {method.eyebrow}
                </span>
                <strong style={{ display: "block", fontSize: 20 }}>{method.title}</strong>
                <span
                  style={{
                    display: "block",
                    color: "var(--checkout-text-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  {method.description}
                  {hasTransferDiscount
                    ? ` Esta tienda aplica ${bankTransferDiscountPercentage}% de descuento pagando por transferencia.`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            borderRadius: 22,
            border: "1px solid var(--checkout-border)",
            background: "var(--checkout-card-bg)",
            padding: 18,
            display: "grid",
            gap: 8,
          }}
        >
          <strong style={{ color: "var(--checkout-text-strong)" }}>Que pasa despues</strong>
            <p
              style={{
                margin: 0,
                color: "var(--checkout-text-muted)",
                lineHeight: 1.7,
              }}
            >
              {effectiveSelectedMethod?.id === "bank_transfer"
              ? bankTransferDiscountPercentage > 0
                ? `En la revision final vas a subir el comprobante y se aplicara un ${bankTransferDiscountPercentage}% de descuento a la transferencia.`
                : "En la revision final vas a subir el comprobante para que el comercio valide la transferencia."
              : effectiveSelectedMethod?.id === "cash"
                ? "El pedido quedara reservado para que puedas pagarlo en efectivo al momento del retiro."
              : "Al confirmar, el pedido se registra con Mercado Pago como medio de cobro online."}
            </p>
        </div>

        <button
          disabled={!effectiveSelectedMethod || !selectedShipping}
          onClick={() =>
            effectiveSelectedMethod &&
            selectedShipping &&
            onNext({
              paymentMethod: effectiveSelectedMethod.id,
              paymentLabel: effectiveSelectedMethod.title,
              shippingOption: selectedShipping,
            })
          }
          style={{
            border: "none",
            borderRadius: 999,
            background:
              effectiveSelectedMethod && selectedShipping
                ? "var(--checkout-primary-bg)"
                : "var(--checkout-card-alt-bg)",
            color:
              effectiveSelectedMethod && selectedShipping
                ? "var(--checkout-primary-color)"
                : "var(--checkout-text-muted)",
            padding: "15px 18px",
            fontWeight: 700,
            cursor: effectiveSelectedMethod && selectedShipping ? "pointer" : "not-allowed",
          }}
        >
          Continuar a revision
        </button>
      </aside>
    </section>
  );
}
