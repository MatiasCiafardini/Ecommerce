import { editorialLines } from "@/themes/minimal/visuals";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function Newsletter({
  title = "Suscribite al drop list",
  subtitle = "Enterate antes que nadie de capsulas nuevas, reposiciones y descuentos exclusivos.",
}: Props) {
  return (
    <section
      className="theme-block-section theme-block-section--newsletter"
      style={{
        padding: "84px 20px",
      }}
    >
      <div
        className="theme-pulse-glow theme-newsletter-shell"
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "42px 30px",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--theme-radius-shell)",
          backgroundSize: "cover, cover, cover",
          textAlign: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className="theme-ambient-pan"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: editorialLines,
            opacity: 0.16,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 3vw, 3rem)",
              textTransform: "uppercase",
              marginBottom: 12,
              color: "var(--text-strong)",
            }}
          >
            {title}
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.8 }}>
            {subtitle}
          </p>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="Tu email"
              style={{
                padding: "14px 16px",
                minWidth: 280,
                background: "var(--newsletter-input-bg)",
                border: "1px solid var(--border-soft)",
                borderRadius: 999,
                color: "var(--text-strong)",
              }}
            />

            <button
              className="theme-button"
              style={{
                padding: "14px 18px",
                background: "var(--paper)",
                color: "var(--background)",
                border: "none",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
              }}
            >
              Suscribirme
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
