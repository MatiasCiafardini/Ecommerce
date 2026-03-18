"use client";

import { useCart } from "@/context/cart-context";

export default function CheckoutReview({
  cart,
  address,
  paymentMethod,
}: {
  cart: any[];
  address: any;
  paymentMethod: string | null;
}) {
  const { clearCart } = useCart();

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleConfirm = () => {
    const order = {
      items: cart,
      address,
      paymentMethod,
      total,
    };

    console.log("ORDER FINAL 👉", order);

    clearCart();
  };

  return (
    <div>
      <h2>Confirmar</h2>

      {cart.map((item) => (
        <div key={item.variantId}>
          {item.name} x {item.quantity}
        </div>
      ))}

      <p>Dirección: {address?.street}</p>
      <p>Pago: {paymentMethod}</p>

      <h3>Total: ${total}</h3>

      <button onClick={handleConfirm}>Confirmar compra</button>
    </div>
  );
}
