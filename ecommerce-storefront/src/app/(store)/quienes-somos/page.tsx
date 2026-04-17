export default function QuienesSomosPage() {
  return (
    <section
      style={{
        padding: "72px 20px",
        background: "var(--page-shell-bg)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--theme-layout-max-width, 1280px)",
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Quienes somos
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
            color: "var(--text-strong)",
            letterSpacing: "-0.05em",
          }}
        >
          Trojani
        </h1>
        <p style={{ margin: 0, maxWidth: 760, color: "var(--text-muted)", lineHeight: 1.8 }}>
          Construimos una propuesta de prendas y objetos con una mirada cuidada, piezas que se
          sienten actuales, nobles y faciles de llevar todos los dias.
        </p>
      </div>
    </section>
  );
}
