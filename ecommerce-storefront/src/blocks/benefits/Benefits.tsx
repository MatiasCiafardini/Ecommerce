type BenefitItem = {
  title: string;
  description: string;
  icon?: string;
};

type Props = {
  title?: string;
  items?: BenefitItem[];
};

const defaultItems: BenefitItem[] = [
  {
    title: "Compra segura",
    description: "Procesos simples y pagos cuidados para comprar con confianza.",
    icon: "shield",
  },
  {
    title: "Envios a todo el pais",
    description: "Recibi tus prendas donde estes, con seguimiento de tu pedido.",
    icon: "truck",
  },
  {
    title: "Atencion personalizada",
    description: "Te acompanamos para elegir talles, looks y combinaciones.",
    icon: "heart",
  },
  {
    title: "Novedades constantes",
    description: "Ingresos nuevos y seleccion curada durante toda la temporada.",
    icon: "spark",
  },
];

export default function Benefits({
  title = "Una experiencia pensada para vos",
  items = defaultItems,
}: Props) {
  const safeItems = items.length > 0 ? items : defaultItems;

  return (
    <section
      className="theme-block-section theme-block-section--benefits"
      style={{ padding: "84px 20px" }}
    >
      <div
        style={{
          maxWidth: "var(--theme-layout-max-width, 1280px)",
          margin: "0 auto",
          display: "grid",
          gap: 30,
        }}
      >
        <div style={{ display: "grid", gap: 10, maxWidth: 680 }}>
          <span
            style={{
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Confianza y cercania
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 3.4vw, 3.4rem)",
              letterSpacing: "-0.04em",
              color: "var(--text-strong)",
            }}
          >
            {title}
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {safeItems.map((item) => (
            <article
              key={item.title}
              className="theme-hover-lift theme-block-card"
              style={{
                display: "grid",
                gap: 16,
                padding: 24,
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--theme-radius-card)",
                minHeight: 220,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  border: "1px solid var(--border-soft)",
                  background: "rgba(255,255,255,0.58)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent-strong)",
                }}
              >
                <BenefitIcon icon={item.icon} />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 24, color: "var(--text-strong)" }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, lineHeight: 1.8, color: "var(--text-muted)" }}>
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitIcon({ icon }: { icon?: string }) {
  if (icon === "truck") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 17h4" />
        <path d="M2 7h11v8H2z" />
        <path d="M13 10h4l3 3v2h-7z" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    );
  }

  if (icon === "heart") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 21-1.45-1.32C5.4 15.02 2 11.94 2 8.15 2 5.07 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.04 6.04 0 0 1 16.5 3C19.58 3 22 5.07 22 8.15c0 3.79-3.4 6.87-8.55 11.54z" />
      </svg>
    );
  }

  if (icon === "spark") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
        <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
      </svg>
    );
  }

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 4 7v5c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V7z" />
      <path d="m9.5 12 1.8 1.8 3.2-3.6" />
    </svg>
  );
}
