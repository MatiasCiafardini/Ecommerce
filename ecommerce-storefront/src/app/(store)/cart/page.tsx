"use client";

import { useCart } from "@/context/cart-context";

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div style={{ padding: "40px" }}>
        <h1>🛒 Carrito</h1>
        <p>Tu carrito está vacío</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ marginBottom: "20px" }}>🛒 Carrito</h1>

      {/* items */}
      <div style={{ marginBottom: "30px" }}>
        {cart.map((item) => (
          <div
            key={item.variantId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #ddd",
              padding: "10px 0",
            }}
          >
            <div>
              <h3>{item.name}</h3>

              {(item.size || item.color) && (
                <p style={{ fontSize: "14px", color: "#666" }}>
                  {item.size} {item.color}
                </p>
              )}

              <p>
                ${item.price} x {item.quantity}
              </p>
            </div>

            <button
              onClick={() => removeFromCart(item.variantId)}
              style={{
                background: "red",
                color: "white",
                border: "none",
                padding: "6px 10px",
                cursor: "pointer",
                height: "fit-content",
              }}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {/* total */}
      <h2>Total: ${total}</h2>

      {/* acciones */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={clearCart}
          style={{
            marginRight: "10px",
            padding: "10px 20px",
            border: "1px solid black",
            background: "white",
            cursor: "pointer",
          }}
        >
          Vaciar carrito
        </button>

        <a href="/checkout">
          <button
            style={{
              padding: "10px 20px",
              background: "black",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Ir a pagar
          </button>
        </a>
      </div>
    </div>
  );
}
