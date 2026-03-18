"use client";

import { useState } from "react";
import { useCart } from "@/context/cart-context";

type Props = {
  product: any;
};

export default function ProductView({ product }: Props) {
  const { addToCart } = useCart();
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariant, setSelectedVariant] = useState(
    hasVariants ? product.variants[0] : null,
  );

  const image =
    product.images && product.images.length > 0
      ? product.images[0].url
      : "/images/product_holder.png";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "40px",
        padding: "60px 20px",
      }}
    >
      {/* imagen */}
      <div>
        <img src={image} style={{ width: "100%" }} />
      </div>

      {/* info */}
      <div>
        <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
          {product.title}
        </h1>

        {selectedVariant?.price && (
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>
            ${selectedVariant.price}
          </p>
        )}

        {/* 🔥 VARIANTES */}
        {hasVariants && (
          <div style={{ margin: "20px 0" }}>
            {product.variants?.map((variant: any) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                style={{
                  marginRight: "10px",
                  padding: "8px 12px",
                  border:
                    selectedVariant?.id === variant.id
                      ? "2px solid black"
                      : "1px solid gray",
                  background:
                    selectedVariant?.id === variant.id ? "#eee" : "white",
                  cursor: "pointer",
                }}
              >
                {variant.size} {variant.color}
              </button>
            ))}
          </div>
        )}

        {/* botón */}
        <button
          onClick={() => {
            const variant = hasVariants ? selectedVariant : null;

            addToCart({
              productId: product.id,
              variantId: variant?.id || product.id, // fallback 🔥
              name: product.title,
              price: variant?.price || product.price || 0,
              quantity: 1,
              size: variant?.size,
              color: variant?.color,
            });
          }}
          style={{
            padding: "12px 24px",
            background: "black",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
