"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/cart-context";

export default function CartPage() {
  const { cart, isHydrated, updateQuantity, removeFromCart, clearCart } = useCart();
  const [cartError, setCartError] = useState("");

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const variantLabel = (item: (typeof cart)[number]) => {
    const pieces = [item.size ? `Talle ${item.size}` : null, item.color ?? null].filter(Boolean);
    return pieces.length > 0 ? pieces.join(" · ") : "Variante estandar";
  };

  const handleQuantityChange = (variantId: string, nextQuantity: number) => {
    const result = updateQuantity(variantId, nextQuantity);

    if (!result.ok) {
      setCartError(result.reason ?? "No se pudo actualizar la cantidad.");
      return;
    }

    setCartError("");
  };

  const getCartStockMessage = (item: (typeof cart)[number]) => {
    if (item.quantity >= item.maxAvailable) {
      return "Ya agregaste las ultimas unidades disponibles.";
    }

    if (item.maxAvailable < 10) {
      return "Ultimas unidades disponibles.";
    }

    return null;
  };

  if (!isHydrated) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 180px)",
          padding: "72px 24px",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 40%), #0b0b0b",
        }}
      >
        <div
          style={{
            maxWidth: 840,
            margin: "0 auto",
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: "42px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              fontSize: 12,
              color: "rgba(247,241,232,0.5)",
            }}
          >
            Carrito
          </p>
          <h1
            style={{
              margin: "18px 0 14px",
              fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
              letterSpacing: "-0.06em",
            }}
          >
            Cargando tu seleccion
          </h1>
          <p
            style={{
              maxWidth: 560,
              margin: "0 auto",
              color: "rgba(247,241,232,0.68)",
              lineHeight: 1.8,
            }}
          >
            Estamos recuperando los productos que ya tenias guardados en el carrito.
          </p>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 180px)",
          padding: "72px 24px",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 40%), #0b0b0b",
        }}
      >
        <div
          style={{
            maxWidth: 840,
            margin: "0 auto",
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: "42px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              fontSize: 12,
              color: "rgba(247,241,232,0.5)",
            }}
          >
            Carrito
          </p>
          <h1
            style={{
              margin: "18px 0 14px",
              fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
              letterSpacing: "-0.06em",
            }}
          >
            Tu seleccion esta vacia
          </h1>
          <p
            style={{
              maxWidth: 560,
              margin: "0 auto",
              color: "rgba(247,241,232,0.68)",
              lineHeight: 1.8,
            }}
          >
            Suma algunas piezas a tu rotacion. Cuando el carrito tenga movimiento,
            aca vas a ver todo organizado para cerrar la compra.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              marginTop: 28,
              padding: "14px 24px",
              borderRadius: 999,
              background: "#f7f1e8",
              color: "#0b0b0b",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Volver al catalogo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: "72px 24px 96px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%), radial-gradient(circle at top right, rgba(243,238,231,0.18), transparent 24%), linear-gradient(180deg, #161616 0%, #0b0b0b 100%)",
      }}
    >
      <div
        className="layout-two-col"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.7fr)",
          alignItems: "start",
        }}
      >
        <section
          style={{
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
            padding: 32,
            display: "grid",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.26em",
                  fontSize: 12,
                  color: "rgba(247,241,232,0.52)",
                }}
              >
                Carrito
              </p>
              <h1
                style={{
                  margin: "12px 0 0",
                  fontSize: "clamp(2.4rem, 4vw, 4rem)",
                  letterSpacing: "-0.05em",
                }}
              >
                Rotacion lista para cerrar
              </h1>
            </div>

            <button
              onClick={clearCart}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "#f7f1e8",
                padding: "12px 18px",
                cursor: "pointer",
              }}
            >
              Vaciar carrito
            </button>
          </div>

          {cartError ? (
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,159,159,0.22)",
                background: "rgba(255,159,159,0.08)",
                padding: "12px 14px",
                color: "#ffd6d6",
              }}
            >
              {cartError}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 16 }}>
            {cart.map((item, index) => {
              const cartStockMessage = getCartStockMessage(item);

              return (
              <article
                key={item.variantId}
                className="layout-cart-item"
                style={{
                  borderRadius: 28,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(8,8,8,0.58)",
                  padding: 22,
                }}
              >
                <div
                  style={{
                    width: 116,
                    minWidth: 116,
                    height: 145,
                    borderRadius: 20,
                    overflow: "hidden",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))",
                    display: "grid",
                    placeItems: "center",
                    color: "rgba(247,241,232,0.56)",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    fontSize: 11,
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                        display: "block",
                      }}
                    />
                  ) : (
                    <>Look {String(index + 1).padStart(2, "0")}</>
                  )}
                </div>

                <div>
                  <p
                    style={{
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      fontSize: 11,
                      color: "rgba(247,241,232,0.46)",
                    }}
                  >
                    Pieza seleccionada
                  </p>
                  <h2 style={{ margin: "10px 0 8px", fontSize: 24 }}>{item.name}</h2>
                  <p
                    style={{
                      margin: "0 0 4px",
                      color: "rgba(247,241,232,0.82)",
                      lineHeight: 1.6,
                    }}
                  >
                    Variante: {variantLabel(item)}
                  </p>
                  {cartStockMessage ? (
                    <p
                      style={{
                        margin: 0,
                        color: "#ffe4bf",
                        lineHeight: 1.7,
                      }}
                    >
                      {cartStockMessage}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                    <span style={{ color: "rgba(247,241,232,0.72)", fontSize: 14 }}>Cantidad</span>
                    <div style={quantityStepperStyle}>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.variantId, item.quantity - 1)}
                        style={quantityButtonStyle}
                      >
                        -
                      </button>
                      <strong style={{ minWidth: 28, textAlign: "center" }}>{item.quantity}</strong>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxAvailable}
                        style={{
                          ...quantityButtonStyle,
                          opacity: item.quantity >= item.maxAvailable ? 0.45 : 1,
                          cursor: item.quantity >= item.maxAvailable ? "not-allowed" : "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                    {item.quantity >= item.maxAvailable ? (
                      <span style={{ color: "#ffe4bf", fontSize: 13 }}>
                        Ya agregaste las ultimas unidades disponibles
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    justifyItems: "end",
                    gap: 12,
                  }}
                >
                  <strong style={{ fontSize: 24 }}>${item.price * item.quantity}</strong>
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#f7f1e8",
                      padding: "10px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
              );
            })}
          </div>
        </section>

        <aside
          className="layout-sidebar"
          style={{
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(243,238,231,0.14), rgba(255,255,255,0.04))",
            padding: 28,
            display: "grid",
            gap: 22,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                fontSize: 12,
                color: "rgba(247,241,232,0.5)",
              }}
            >
              Resumen
            </p>
            <h2 style={{ margin: "12px 0 0", fontSize: 30 }}>Antes de pagar</h2>
          </div>

          <div
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(8,8,8,0.56)",
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
              <span style={{ color: "rgba(247,241,232,0.52)" }}>Se calcula en checkout</span>
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.08)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span>Total estimado</span>
              <strong style={{ fontSize: 26 }}>${subtotal}</strong>
            </div>
          </div>

          <Link
            href="/checkout"
            style={{
              display: "inline-flex",
              justifyContent: "center",
              padding: "15px 20px",
              borderRadius: 999,
              background: "#f7f1e8",
              color: "#0b0b0b",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Ir al checkout
          </Link>

          <p style={{ margin: 0, color: "rgba(247,241,232,0.62)", lineHeight: 1.8 }}>
            Las piezas quedan listas para confirmar direccion, envio y pago en el
            siguiente paso.
          </p>
        </aside>
      </div>
    </main>
  );
}

const quantityStepperStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  padding: "8px 10px",
};

const quantityButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8,8,8,0.46)",
  color: "#f7f1e8",
  cursor: "pointer",
};
