type Props = {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: string;
  textColor?: string;
  image?: string;
};

export default function Hero({
  title = "Nueva colección",
  subtitle = "Descubrí los productos más vendidos",
  buttonText = "Comprar ahora",
  buttonLink = "/",
  backgroundColor = "#f5f5f5",
  textColor = "black",
  image,
}: Props) {
  return (
    <section
      style={{
        background: backgroundColor,
        padding: "120px 20px",
        textAlign: "center",
        color: textColor,
        backgroundImage: image ? `url(${image})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>{title}</h1>

      {subtitle && (
        <p style={{ fontSize: "20px", marginBottom: "30px" }}>{subtitle}</p>
      )}

      {buttonText && (
        <a href={buttonLink}>
          <button
            style={{
              background: "black",
              color: "white",
              padding: "14px 28px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {buttonText}
          </button>
        </a>
      )}
    </section>
  );
}
