export default function Testimonials() {
  const reviews = [
    {
      name: "Ana",
      text: "Las remeras tienen una caida increible y el fit oversized esta perfecto.",
    },
    {
      name: "Milo",
      text: "Los basicos combinan con todo. Llego rapido y la calidad se siente premium.",
    },
    {
      name: "Lucia",
      text: "Me gusto que el estilo sea urbano sin sentirse exagerado. Muy buena curaduria.",
    },
  ];

  return (
    <section
      className="theme-block-section theme-block-section--testimonials"
      style={{
        padding: "20px 20px",
      }}
    >
      <div style={{ maxWidth: "var(--store-reading-max)", margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "clamp(1.8rem, 3vw, 3rem)",
            textTransform: "uppercase",
            marginBottom: 28,
            color: "var(--text-strong)",
          }}
        >
          Lo que se esta usando
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {reviews.map((r, index) => (
            <blockquote
              key={r.name}
              className="theme-hover-lift theme-block-card theme-testimonial-card"
              data-featured={index === 1 ? "true" : "false"}
              style={{
                margin: 0,
                padding: 24,
                borderRadius: "var(--theme-radius-card)",
                border: "1px solid var(--border-soft)",
                backgroundSize: "cover, cover, cover",
              }}
            >
              <p style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 18, color: "var(--text-strong)" }}>
                &quot;{r.text}&quot;
              </p>
              <small
                style={{
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                }}
              >
                {r.name}
              </small>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
