import { concreteTexture, editorialLines, urbanSkyline } from "@/themes/minimal/visuals";

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
  title = "Streetwear para todos los dias",
  subtitle = "Remeras pesadas, buzos amplios y basicos con actitud urbana. Menos ruido, mas presencia.",
  buttonText = "Explorar catalogo",
  buttonLink = "/product",
  backgroundColor = "#111111",
  textColor = "white",
  image,
}: Props) {
  return (
    <section
      className="theme-ambient-pan"
      style={{
        background:
          image
            ? `linear-gradient(135deg, rgba(16,16,16,0.74), rgba(36,36,36,0.42)), url(${image}), ${urbanSkyline}`
            : `linear-gradient(135deg, ${backgroundColor} 0%, #232323 48%, #b3aba0 100%), ${urbanSkyline}`,
        padding: "88px 20px 96px",
        color: textColor,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 36,
          alignItems: "center",
        }}
      >
        <div className="theme-enter-soft">
          <div
            style={{
              display: "inline-flex",
              padding: "8px 12px",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 999,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 20,
              background: "rgba(255,255,255,0.05)",
            }}
          >
            Nueva capsula 2026
          </div>

          <h1
            style={{
              fontSize: "clamp(3rem, 7vw, 6rem)",
              lineHeight: 0.95,
              marginBottom: 18,
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
              color: "#ffffff",
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              style={{
                fontSize: 18,
                maxWidth: 560,
                marginBottom: 28,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.7,
              }}
            >
              {subtitle}
            </p>
          )}

          {buttonText && (
            <a href={buttonLink} style={{ textDecoration: "none" }}>
              <button
                className="theme-button"
                style={{
                  background: "#f3eee7",
                  color: "#101010",
                  padding: "16px 24px",
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {buttonText}
              </button>
            </a>
          )}
        </div>

        <div
          className="theme-hover-lift theme-float-slow"
          style={{
            minHeight: 420,
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.14)",
            background:
              `linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03)), ${editorialLines}, ${concreteTexture}`,
            padding: 24,
            display: "grid",
            alignContent: "space-between",
            backgroundSize: "cover, cover, cover",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            <span>Oversized fit</span>
            <span>Drop limitado</span>
          </div>

          <div
            style={{
              border: "1px dashed rgba(255,255,255,0.18)",
              borderRadius: 26,
              minHeight: 260,
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            }}
          >
            Placeholder editorial
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["Heavy cotton", "Wide leg", "Neutral tones"].map((tag) => (
              <span
                key={tag}
                style={{
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 999,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.82)",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
