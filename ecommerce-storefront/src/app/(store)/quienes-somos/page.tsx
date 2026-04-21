const storeAddress = "Buenos Aires, Argentina";
const mapsQuery = encodeURIComponent(storeAddress);
const mapEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&z=14&output=embed`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

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
          gap: 24,
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
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
              fontSize: "clamp(2.4rem, 5vw, 4.6rem)",
              color: "var(--text-strong)",
              letterSpacing: "-0.05em",
              lineHeight: 0.95,
            }}
          >
            Mila Shoes
          </h1>
        </div>

        <div
          className="layout-two-col"
          style={{
            gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 0.92fr)",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          <article
            style={{
              borderRadius: 36,
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-bg)",
              padding: "clamp(22px, 3vw, 34px)",
              display: "grid",
              gap: 20,
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Nuestra historia
              </span>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-strong)",
                  fontSize: "clamp(1.3rem, 2.2vw, 2rem)",
                  lineHeight: 1.18,
                }}
              >
                Calzado femenino con identidad propia
              </p>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  lineHeight: 1.85,
                  maxWidth: 720,
                }}
              >
                En Mila Shoes creemos que el calzado es mucho más que un accesorio: es la base de cada look, la primera impresión y el detalle que completa una personalidad. Por eso, cada par que ofrecemos está pensado con cuidado, combinando comodidad real con una estética limpia y contemporánea.
              </p>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  lineHeight: 1.85,
                  maxWidth: 720,
                }}
              >
                Nacimos con una idea simple: llevar calzado de calidad a quienes buscan zapatos que duren, que se vean bien y que acompañen sin esfuerzo el ritmo del día a día. Seleccionamos cada modelo con criterio, priorizando materiales nobles, siluetas versátiles y terminaciones que marcan la diferencia.
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Nuestro compromiso
              </span>
              <div style={{ display: "grid", gap: 14 }}>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    lineHeight: 1.85,
                    maxWidth: 720,
                  }}
                >
                  Trabajamos con proveedores de confianza y renovamos nuestra colección constantemente para que siempre encuentres algo nuevo. Botas, borcegos, sneakers y más: cada categoría tiene su identidad, pero todas comparten el mismo estándar de calidad que nos define.
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    lineHeight: 1.85,
                    maxWidth: 720,
                  }}
                >
                  Nuestra mayor satisfacción es saber que cuando elegís un par de Mila Shoes, sabés exactamente lo que estás llevando: diseño, calidad y un estilo que no pasa de moda.
                </p>
              </div>
            </div>
          </article>

          <aside
            style={{
              borderRadius: 36,
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-bg)",
              overflow: "hidden",
              display: "grid",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: 320,
                background: "var(--block-card-bg)",
              }}
            >
              <iframe
                src={mapEmbedUrl}
                title="Ubicacion Mila Shoes"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
              />
            </div>

            <div
              style={{
                padding: "22px 24px 26px",
                display: "grid",
                gap: 12,
              }}
            >
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Encontranos
              </span>
              <strong
                style={{
                  color: "var(--text-strong)",
                  fontSize: 24,
                  lineHeight: 1.15,
                }}
              >
                Veni a conocer nuestra tienda
              </strong>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  lineHeight: 1.75,
                }}
              >
                {storeAddress}.
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="theme-button"
                style={{
                  width: "fit-content",
                  textDecoration: "none",
                  padding: "13px 18px",
                  borderRadius: 999,
                  background: "var(--text-strong)",
                  color: "var(--page-panel-bg)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Abrir en Google Maps
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
