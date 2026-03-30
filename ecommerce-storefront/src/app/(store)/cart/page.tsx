"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { api } from "@/lib/api";
import { formatCurrency, roundCurrency } from "@/lib/currency";

type Inventory = {
  quantity?: number;
  reserved?: number;
};

type ProductVariant = {
  id: number;
  inventories?: Inventory[];
};

type StoreProduct = {
  variants?: ProductVariant[];
};

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoadingState />}>
      <CartPageInner />
    </Suspense>
  );
}

function CartPageInner() {
  const { cart, isHydrated, updateQuantity, removeFromCart, clearCart, replaceCart } = useCart();
  const searchParams = useSearchParams();
  const [cartError, setCartError] = useState("");
  const [stockSyncMessage, setStockSyncMessage] = useState("");
  const [syncingStock, setSyncingStock] = useState(false);

  const stockIssueFlag = searchParams.get("stockIssue");
  const subtotal = roundCurrency(
    cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
  );
  const cartSignature = useMemo(
    () => cart.map((item) => `${item.variantId}:${item.quantity}:${item.maxAvailable}`).join("|"),
    [cart],
  );

  useEffect(() => {
    if (!isHydrated || cart.length === 0 || !stockIssueFlag) {
      return;
    }

    let cancelled = false;

    const syncCartStock = async () => {
      try {
        setSyncingStock(true);
        setCartError("");
        setStockSyncMessage("");

        const uniqueSlugs = [...new Set(cart.map((item) => item.slug).filter(Boolean))] as string[];
        if (uniqueSlugs.length === 0) {
          return;
        }

        const products = await Promise.all(
          uniqueSlugs.map((slug) => api(`/store/products/${slug}`)),
        );

        if (cancelled) {
          return;
        }

        const stockByVariant = new Map<string, number>();

        for (const product of products as StoreProduct[]) {
          const variants = Array.isArray(product?.variants) ? product.variants : [];

          for (const variant of variants) {
            const inventories = Array.isArray(variant.inventories) ? variant.inventories : [];
            const available = inventories.reduce(
              (total, inventory) =>
                total + Math.max(Number(inventory.quantity ?? 0) - Number(inventory.reserved ?? 0), 0),
              0,
            );

            stockByVariant.set(String(variant.id), available);
          }
        }

        const adjustedItems: Array<{ name: string; previousQuantity: number; nextQuantity: number }> = [];
        const removedItems: Array<{ name: string; previousQuantity: number }> = [];
        let changed = false;

        const nextCart = cart.flatMap((item) => {
          const freshAvailable = stockByVariant.get(item.variantId);

          if (freshAvailable === undefined) {
            return [{ ...item }];
          }

          if (freshAvailable <= 0) {
            removedItems.push({ name: item.name, previousQuantity: item.quantity });
            changed = true;
            return [];
          }

          const nextQuantity = Math.min(item.quantity, freshAvailable);
          if (nextQuantity !== item.quantity || freshAvailable !== item.maxAvailable) {
            adjustedItems.push({
              name: item.name,
              previousQuantity: item.quantity,
              nextQuantity,
            });
            changed = true;
          }

          return [{ ...item, quantity: nextQuantity, maxAvailable: freshAvailable }];
        });

        if (changed) {
          replaceCart(nextCart);
        }

        if (removedItems.length > 0 || adjustedItems.length > 0) {
          const messages: string[] = [];

          if (adjustedItems.length > 0) {
            if (adjustedItems.length === 1) {
              const item = adjustedItems[0];
              messages.push(
                `${item.name} se ajusto de ${item.previousQuantity} ${item.previousQuantity === 1 ? "unidad" : "unidades"} a ${item.nextQuantity} ${item.nextQuantity === 1 ? "unidad" : "unidades"} por disponibilidad actual.`,
              );
            } else {
              messages.push(
                adjustedItems
                  .map(
                    (item) =>
                      `${item.name}: ${item.previousQuantity} a ${item.nextQuantity} ${item.nextQuantity === 1 ? "unidad" : "unidades"}`,
                  )
                  .join(" "),
              );
            }
          }

          if (removedItems.length > 0) {
            if (removedItems.length === 1) {
              const item = removedItems[0];
              messages.push(
                `${item.name} se retiro del carrito porque ya no tiene stock. Tenias ${item.previousQuantity} ${item.previousQuantity === 1 ? "unidad" : "unidades"} seleccionadas.`,
              );
            } else {
              messages.push(
                removedItems
                  .map(
                    (item) =>
                      `${item.name} se retiro del carrito porque ya no tiene stock. Tenias ${item.previousQuantity} ${item.previousQuantity === 1 ? "unidad" : "unidades"} seleccionadas.`,
                  )
                  .join(" "),
              );
            }
          }

          setStockSyncMessage(messages.join(" "));
        } else if (!stockSyncMessage) {
          setStockSyncMessage("Revisamos tu carrito y el stock actual ya esta alineado.");
        }
      } catch (error) {
        if (!cancelled) {
          setCartError(error instanceof Error ? error.message : "No pudimos actualizar el stock del carrito.");
        }
      } finally {
        if (!cancelled) {
          setSyncingStock(false);
        }
      }
    };

    void syncCartStock();

    return () => {
      cancelled = true;
    };
  }, [cart, cartSignature, isHydrated, replaceCart, stockIssueFlag, stockSyncMessage]);

  const variantLabel = (item: (typeof cart)[number]) => {
    const pieces = [item.size ? `Talle ${item.size}` : null, item.color ?? null].filter(Boolean);
    return pieces.length > 0 ? pieces.join(" - ") : "Variante estandar";
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
          background: "var(--page-shell-bg)",
        }}
      >
        <div
          style={{
            maxWidth: 840,
            margin: "0 auto",
            borderRadius: 36,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
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
              color: "var(--text-muted)",
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
              color: "var(--text-muted)",
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
          background: "var(--page-shell-bg)",
        }}
      >
        <div
          style={{
            maxWidth: 840,
            margin: "0 auto",
            borderRadius: 36,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
            padding: "42px",
            textAlign: "center",
          }}
        >
          {stockSyncMessage ? (
            <div
              style={{
                marginBottom: 18,
                borderRadius: 18,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-strong-bg)",
                padding: "14px 16px",
                color: "var(--text-muted)",
                textAlign: "left",
                lineHeight: 1.7,
              }}
            >
              {stockSyncMessage}
            </div>
          ) : null}

          {cartError ? (
            <div
              style={{
                marginBottom: 18,
                borderRadius: 18,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-strong-bg)",
                padding: "14px 16px",
                color: "var(--text-muted)",
                textAlign: "left",
                lineHeight: 1.7,
              }}
            >
              {cartError}
            </div>
          ) : null}

          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              fontSize: 12,
              color: "var(--text-muted)",
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
              color: "var(--text-muted)",
              lineHeight: 1.8,
            }}
          >
            Suma tus prendas favoritas y vas a ver todo organizado para revisar tu
            compra con calma antes de pagar.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              marginTop: 28,
              padding: "14px 24px",
              borderRadius: 999,
              background: "var(--accent-strong)",
              color: "var(--accent-contrast)",
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
        background: "var(--page-shell-bg)",
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
                  color: "var(--text-muted)",
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
                Tu seleccion esta lista
              </h1>
            </div>

            <button
              onClick={clearCart}
              style={{
                borderRadius: 999,
                border: "1px solid var(--border-soft)",
                background: "transparent",
                color: "var(--text-strong)",
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
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-strong-bg)",
                padding: "12px 14px",
                color: "var(--text-muted)",
              }}
            >
              {cartError}
            </div>
          ) : null}

          {stockSyncMessage ? (
            <div
              style={{
                borderRadius: 18,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-strong-bg)",
                padding: "12px 14px",
                color: "var(--text-muted)",
              }}
            >
              {stockSyncMessage}
            </div>
          ) : null}

          {syncingStock ? (
            <div
              style={{
                borderRadius: 18,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                padding: "12px 14px",
                color: "var(--text-muted)",
              }}
            >
              Revisando stock actualizado del carrito...
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
                    border: "1px solid var(--border-soft)",
                    background: "var(--page-panel-strong-bg)",
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
                      background: "var(--product-media-fallback)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      fontSize: 11,
                    }}
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={116}
                        height={145}
                        unoptimized
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          objectPosition: "center center",
                          display: "block",
                          padding: 10,
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
                        color: "var(--text-muted)",
                      }}
                    >
                      Prenda seleccionada
                    </p>
                    <h2 style={{ margin: "10px 0 8px", fontSize: 24 }}>{item.name}</h2>
                    <p
                      style={{
                        margin: "0 0 4px",
                        color: "var(--text-muted)",
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
                      <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Cantidad</span>
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
                    <strong style={{ fontSize: 24 }}>
                      {formatCurrency(roundCurrency(item.price * item.quantity))}
                    </strong>
                    <button
                      onClick={() => removeFromCart(item.variantId)}
                      style={{
                        borderRadius: 999,
                        border: "1px solid var(--border-soft)",
                        background: "var(--block-card-bg)",
                        color: "var(--text-strong)",
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
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-bg)",
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
                color: "var(--text-muted)",
              }}
            >
              Resumen
            </p>
            <h2 style={{ margin: "12px 0 0", fontSize: 30 }}>Antes de pagar</h2>
          </div>

          <div
            style={{
              borderRadius: 24,
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-strong-bg)",
              padding: 20,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--text-muted)" }}>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--text-muted)" }}>Envio</span>
              <span style={{ color: "var(--text-muted)" }}>Se calcula en checkout</span>
            </div>
            <div
              style={{
                height: 1,
                background: "var(--border-soft)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span>Total estimado</span>
              <strong style={{ fontSize: 26 }}>{formatCurrency(subtotal)}</strong>
            </div>
          </div>

          <Link
            href="/checkout"
            style={{
              display: "inline-flex",
              justifyContent: "center",
              padding: "15px 20px",
              borderRadius: 999,
              background: "var(--text-strong)",
              color: "var(--page-panel-bg)",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Ir al checkout
          </Link>

          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.8 }}>
            Tus prendas quedan listas para confirmar direccion, envio y pago en el
            siguiente paso.
          </p>
        </aside>
      </div>
    </main>
  );
}

function CartLoadingState() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 180px)",
        padding: "72px 24px",
        background: "var(--page-shell-bg)",
      }}
    >
      <div
        style={{
          maxWidth: 840,
          margin: "0 auto",
          borderRadius: 36,
          border: "1px solid var(--border-soft)",
          background: "var(--page-panel-bg)",
          padding: "42px",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Cargando carrito...
      </div>
    </main>
  );
}

const quantityStepperStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 999,
  border: "1px solid var(--border-soft)",
  background: "var(--block-card-bg)",
  padding: "8px 10px",
};

const quantityButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "1px solid var(--border-soft)",
  background: "var(--page-panel-bg)",
  color: "var(--text-strong)",
  cursor: "pointer",
};

