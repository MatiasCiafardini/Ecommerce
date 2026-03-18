import { concreteTexture, editorialLines } from "@/themes/minimal/visuals";

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
    <section style={{ padding: "84px 20px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: "clamp(1.8rem, 3vw, 3rem)",
            textTransform: "uppercase",
            marginBottom: 28,
            color: "#fff",
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
              className="theme-hover-lift"
              style={{
                margin: 0,
                padding: 24,
                borderRadius: 28,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  index === 1
                    ? `linear-gradient(180deg, rgba(243,238,231,0.16), rgba(255,255,255,0.05)), ${editorialLines}, ${concreteTexture}`
                    : `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), ${editorialLines}, ${concreteTexture}`,
                backgroundSize: "cover, cover, cover",
              }}
            >
              <p style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 18, color: "#fff" }}>
                "{r.text}"
              </p>
              <small
                style={{
                  color: "rgba(250,244,236,0.68)",
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
