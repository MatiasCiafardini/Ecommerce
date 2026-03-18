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
  provider: string;
  method: string;
  price: number;
  estimatedDays: number;
};

export default function CheckoutPage() {
  const { cart } = useCart();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(2);
  const [syncing, setSyncing] = useState(false);
  const [cartId, setCartId] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(
    null,
  );
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/checkout");
    }
  }, [user, loading, router]);

  const syncServerCart = async () => {
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    const serverCart = await api("/store/cart", {
      method: "POST",
      body: JSON.stringify({ customerId: user.id }),
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

  const handleAddressNext = async (address: any) => {
    try {
      setSyncing(true);
      const serverCartId = await syncServerCart();
      const options = await api("/store/shipping/options", {
        method: "POST",
        body: JSON.stringify({
          cartId: serverCartId,
          postalCode: address.zip,
        }),
      });

      setCartId(serverCartId);
      setSelectedAddress(address);
      setShippingOptions(options);
      setStep(3);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo preparar el checkout",
      );
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <section style={{ padding: "72px 24px", minHeight: "calc(100vh - 180px)" }}>
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
          Cargando checkout...
        </div>
      </section>
    );
  }

  if (!user) return null;

  if (cart.length === 0) {
    return (
      <section
        style={{
          padding: "72px 24px",
          minHeight: "calc(100vh - 180px)",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 34%), #0b0b0b",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
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
              color: "rgba(247,241,232,0.5)",
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
            Tu carrito está vacío
          </h1>
          <p style={{ margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.8 }}>
            Sumá algunas piezas antes de pasar por caja. Cuando el carrito tenga
            contenido, el checkout va a quedar listo para cerrar.
          </p>
        </div>
      </section>
    );
  }

  return (
    <CheckoutLayout step={step}>
      {step === 2 && (
        <>
          {syncing ? (
            <div
              style={{
                marginBottom: 16,
                padding: "16px 20px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "rgba(247,241,232,0.68)",
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
          onNext={({ paymentMethod, shippingOption }) => {
            setPaymentMethod(paymentMethod);
            setShippingOption(shippingOption);
            setStep(4);
          }}
        />
      )}

      {step === 4 && cartId && (
        <CheckoutReview
          cart={cart}
          cartId={cartId}
          address={selectedAddress}
          paymentMethod={paymentMethod}
          shippingOption={shippingOption}
        />
      )}
    </CheckoutLayout>
  );
}
