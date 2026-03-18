type Props = {
  product: any;
};

export default function ProductCard({ product }: Props) {
  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0].url
      : "/images/product_holder.png";

  const price = product.variants?.[0]?.price;

  return (
    <div
      style={{
        border: "1px solid #eee",
        padding: "20px",
        transition: "all 0.2s ease",
      }}
    >
      <a href={`/product/${product.slug}`}>
        <img
          src={imageUrl}
          style={{
            width: "100%",
            marginBottom: "10px",
          }}
        />
      </a>

      <h3 style={{ marginBottom: "5px" }}>{product.title}</h3>

      {price && <p style={{ fontWeight: "bold" }}>${price}</p>}
    </div>
  );
}
