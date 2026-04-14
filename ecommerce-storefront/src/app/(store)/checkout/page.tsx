"use client";

import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import CheckoutLayout from "@/components/checkout/CheckoutLayout";
import CheckoutAddress from "@/components/checkout/CheckoutAddress";
import CheckoutPayment from "@/components/checkout/CheckoutPayment";
import CheckoutReview from "@/components/checkout/CheckoutReview";

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

type CheckoutPaymentSelection = {
  paymentMethod: string;
  paymentLabel: string;
};

type CheckoutAddress = {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
};

type CheckoutSetupError = {
  title: string;
  message: string;
};

export default function CheckoutPage() {
  const { cart } = useCart();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(2);
  const [syncing, setSyncing] = useState(false);
  const [cartId, setCartId] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<CheckoutAddress | null>(null);
  const [paymentSelection, setPaymentSelection] = useState<CheckoutPaymentSelection | null>(null);
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(
    null,
  );
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [setupError, setSetupError] = useState<CheckoutSetupError | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("checkoutRedirectingOrderId");
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/checkout");
    }
  }, [user, loading, router]);

  const resolveSetupError = (error: unknown): CheckoutSetupError => {
    const fallback = {
      title: "No pudimos preparar el checkout",
      message: "Intenta nuevamente o vuelve al carrito para revisar los productos.",
    };

    if (!(error instanceof Error)) {
      return fallback;
    }

    const message = error.message.trim();
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("stock") ||
      normalizedMessage.includes("inventario") ||
      normalizedMessage.includes("not enough stock")
    ) {
      return {
        title: "Hay productos sin stock suficiente",
        message:
          "Mientras avanzabas en la compra, cambio la disponibilidad de uno o mas productos. Vuelve al carrito para ajustar cantidades antes de seguir.",
      };
    }

    return {
      title: fallback.title,
      message: message || fallback.message,
    };
  };

  const syncServerCart = async () => {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    const serverCart = await api("/store/cart", {
      method: "POST",
      body: JSON.stringify({}),
    });

    await api(`/store/cart/${serverCart.id}/items`, {
      method: "DELETE",
    });

    for (const item of cart) {
      await api(`/store/cart/${serverCart.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          variantId: Number(item.variantId),
          quantity: item.quantity,
        }),
      });
    }

    return serverCart.id as number;
  };

  const handleAddressNext = async (address: CheckoutAddress) => {
    try {
      setSyncing(true);
      setSetupError(null);
      const serverCartId = await syncServerCart();
      const options = await api("/store/shipping/options", {
        method: "POST",
        body: JSON.stringify({
          cartId: serverCartId,
          postalCode: address.zip,
          state: address.state,
          city: address.city,
          country: address.country,
        }),
      });

      setCartId(serverCartId);
      setSelectedAddress(address);
      setShippingOptions(options);
      setStep(3);
    } catch (error) {
      setSetupError(resolveSetupError(error));
    } finally {
      setSyncing(false);
    }
  };

  const canNavigateToStep = (targetStep: number) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return true;
    if (targetStep === 3) {
      return Boolean(selectedAddress && shippingOptions.length > 0);
    }
    if (targetStep === 4) {
      return Boolean(
        cartId &&
          selectedAddress &&
          shippingOption &&
          paymentSelection?.paymentMethod,
      );
    }

    return false;
  };

  const handleStepSelect = (targetStep: number) => {
    if (!canNavigateToStep(targetStep)) {
      return;
    }

    if (targetStep === 1) {
      router.push("/cart");
      return;
    }

    setStep(targetStep);
  };

  if (loading) {
    return (
      <section style={{ padding: "72px 24px", minHeight: "calc(100vh - 180px)" }}>
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
          Cargando checkout...
        </div>
      </section>
    );
  }

  if (!user) return null;

  const redirectingOrderId =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("checkoutRedirectingOrderId")
      : null;

  if (cart.length === 0 && redirectingOrderId) {
    return (
      <section
        style={{
          padding: "72px 24px",
          minHeight: "calc(100vh - 180px)",
          background: "var(--page-shell-bg)",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            borderRadius: 36,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: 40,
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            Checkout
          </p>
          <h1
            style={{
              margin: "18px 0 14px",
              fontSize: "clamp(2.3rem, 6vw, 4.2rem)",
              letterSpacing: "-0.06em",
              color: "var(--text-strong)",
            }}
          >
            Abriendo tu pedido
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.8 }}>
            Te estamos llevando al detalle de la compra que acabas de confirmar.
          </p>
        </div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section
        style={{
          padding: "72px 24px",
          minHeight: "calc(100vh - 180px)",
          background: "var(--page-shell-bg)",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            borderRadius: 36,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: 40,
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            Checkout
          </p>
          <h1
            style={{
              margin: "18px 0 14px",
              fontSize: "clamp(2.3rem, 6vw, 4.2rem)",
              letterSpacing: "-0.06em",
            }}
          >
            Tu carrito esta vacio
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.8 }}>
            Suma algunas prendas antes de pasar por caja. Cuando el carrito tenga
            contenido, el checkout va a quedar listo para cerrar.
          </p>
        </div>
      </section>
    );
  }

  return (
    <CheckoutLayout
      step={step}
      onStepSelect={handleStepSelect}
      canNavigateToStep={canNavigateToStep}
    >
      {step === 2 && (
        <>
          {setupError ? (
            <div
              style={{
                marginBottom: 16,
                padding: "18px 20px",
                borderRadius: 20,
                border: "1px solid rgba(255,159,159,0.24)",
                background: "rgba(120,18,18,0.18)",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ color: "#fff", fontSize: 18 }}>{setupError.title}</strong>
                <p style={{ margin: 0, color: "rgba(247,241,232,0.74)", lineHeight: 1.7 }}>
                  {setupError.message}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => router.push("/cart?stockIssue=1")}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    background: "#f7f1e8",
                    color: "#0b0b0b",
                    padding: "13px 18px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Volver al carrito
                </button>
                <button
                  type="button"
                  onClick={() => setSetupError(null)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "#f7f1e8",
                    padding: "13px 18px",
                    cursor: "pointer",
                  }}
                >
                  Seguir revisando
                </button>
              </div>
            </div>
          ) : null}
          {syncing ? (
            <div
              style={{
                marginBottom: 16,
                padding: "16px 20px",
                borderRadius: 20,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                color: "var(--text-muted)",
              }}
            >
              Preparando checkout...
            </div>
          ) : null}
          <CheckoutAddress onNext={handleAddressNext} />
        </>
      )}

      {step === 3 && (
        <CheckoutPayment
          shippingOptions={shippingOptions}
          onNext={({ paymentMethod, paymentLabel, shippingOption }) => {
            setPaymentSelection({ paymentMethod, paymentLabel });
            setShippingOption(shippingOption);
            setStep(4);
          }}
        />
      )}

      {step === 4 && cartId && selectedAddress && (
        <CheckoutReview
          cart={cart}
          cartId={cartId}
          address={selectedAddress}
          paymentMethod={paymentSelection?.paymentMethod ?? null}
          paymentLabel={paymentSelection?.paymentLabel ?? null}
          shippingOption={shippingOption}
        />
      )}
    </CheckoutLayout>
  );
}
