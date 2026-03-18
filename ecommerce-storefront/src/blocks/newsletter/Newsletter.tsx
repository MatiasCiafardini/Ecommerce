import { concreteTexture, editorialLines, urbanSkyline } from "@/themes/minimal/visuals";

export default function Newsletter() {
  return (
    <section
      style={{
        padding: "84px 20px",
      }}
    >
      <div
        className="theme-pulse-glow"
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "42px 30px",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 36,
          background:
            `linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02)), ${urbanSkyline}, ${concreteTexture}`,
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
              color: "#fff",
            }}
          >
            Suscribite al drop list
          </h2>
          <p style={{ color: "rgba(250,244,236,0.76)", marginBottom: 24, lineHeight: 1.8 }}>
            Enterate antes que nadie de capsulas nuevas, reposiciones y descuentos
            exclusivos.
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
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 999,
                color: "#fff",
              }}
            />

            <button
              className="theme-button"
              style={{
                padding: "14px 18px",
                background: "#f3eee7",
                color: "#111",
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
