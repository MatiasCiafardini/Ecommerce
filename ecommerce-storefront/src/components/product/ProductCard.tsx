import Link from "next/link";

type Props = {
  product: any;
};

export default function ProductCard({ product }: Props) {
  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0].url
      : null;

  const price = product.variants?.[0]?.price;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="theme-hover-lift"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        height: "100%",
        minHeight: "100%",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 28,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        overflow: "hidden",
      }}
    >
      <div
        className="product-card-media"
        style={{
          background: imageUrl
            ? undefined
            : "linear-gradient(145deg, #3a3a3a 0%, #a89f94 100%)",
          display: "grid",
          placeItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="product-card-image"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />
        ) : (
          <span
            style={{
              color: "rgba(255,255,255,0.8)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 12,
            }}
          >
            Product placeholder
          </span>
        )}
      </div>

      <div className="product-card-copy">
        <p
          className="product-card-kicker"
          style={{
            margin: "0 0 10px",
            color: "rgba(250,244,236,0.68)",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
          }}
        >
          Streetwear essential
        </p>
        <h3 className="product-card-title" style={{ margin: "0 0 8px", color: "#ffffff" }}>
          {product.title}
        </h3>
        {price ? (
          <p className="product-card-price" style={{ margin: 0, fontWeight: 700, color: "#f3eee7" }}>
            ${price}
          </p>
        ) : (
          <p className="product-card-price" style={{ margin: 0, color: "rgba(250,244,236,0.7)" }}>
            Consultar precio
          </p>
        )}
      </div>
    </Link>
  );
}
