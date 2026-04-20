const storeAddress =
  "Alsina 317, B2760 San Antonio de Areco, Provincia de Buenos Aires";
const mapsQuery = encodeURIComponent(storeAddress);
const mapEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&z=17&output=embed`;
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
            Trojani
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
                Una década dándole forma al estilo masculino
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
                En Trojani no creemos en las soluciones mágicas ni en las modas
                pasajeras que duran un suspiro. Creemos en el trabajo constante,
                en la evolución y, sobre todo, en la ropa que habla por vos.
              </p>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  lineHeight: 1.85,
                  maxWidth: 720,
                }}
              >
                Nacimos con una idea clara: simplificar el guardarropa del
                hombre moderno sin perder ni un gramo de actitud. Hoy, con casi
                10 años de trayectoria, esa idea se convirtió en una realidad
                sólida. Caminamos junto a vos durante una década, aprendiendo
                qué es lo que realmente buscás cuando elegís una prenda: calidad
                que se banca el uso, un calce que no falla y ese diseño que te
                hace sentir seguro en cualquier lugar.
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
                Trayectoria que genera confianza
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
                  Llegar a una década de historia no es cuestión de suerte. Es
                  el resultado de una obsesión por los detalles que mantenemos
                  desde el primer día. Durante estos años, perfeccionamos
                  nuestras molderías, seleccionamos las mejores materias primas
                  y construimos una comunidad que nos elige una y otra vez.
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    lineHeight: 1.85,
                    maxWidth: 720,
                  }}
                >
                  Esa es nuestra mayor medalla: la confianza de saber que cuando
                  comprás en Trojani, te llevás una prenda respaldada por años
                  de experiencia y compromiso con el buen vestir.
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
                title="Mapa del local Trojani"
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
                Local Trojani
              </span>
              <strong
                style={{
                  color: "var(--text-strong)",
                  fontSize: 24,
                  lineHeight: 1.15,
                }}
              >
                Venite a conocer el espacio
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
