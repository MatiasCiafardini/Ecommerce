"use client";

import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 👇 componentes
import CheckoutLayout from "@/components/checkout/CheckoutLayout";
import CheckoutAddress from "@/components/checkout/CheckoutAddress";
import CheckoutPayment from "@/components/checkout/CheckoutPayment";
import CheckoutReview from "@/components/checkout/CheckoutReview";

export default function CheckoutPage() {
  const { cart } = useCart();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(2);

  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  // 🔐 protección login (correcta)
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/checkout");
    }
  }, [user, loading]);

  // ⏳ esperando auth
  if (loading) return <div>Cargando...</div>;

  // 🚫 no logueado (evita flicker)
  if (!user) return null;

  // 🛒 carrito vacío
  if (cart.length === 0) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>Checkout</h1>
        <p>Tu carrito está vacío</p>
      </div>
    );
  }

  return (
    <CheckoutLayout step={step}>
      {step === 2 && (
        <CheckoutAddress
          onNext={(address) => {
            setSelectedAddress(address);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <CheckoutPayment
          onNext={(method) => {
            setPaymentMethod(method);
            setStep(4);
          }}
        />
      )}

      {step === 4 && (
        <CheckoutReview
          cart={cart}
          address={selectedAddress}
          paymentMethod={paymentMethod}
        />
      )}
    </CheckoutLayout>
  );
}
