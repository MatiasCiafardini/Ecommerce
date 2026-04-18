const mapEmbedUrl =
  "https://www.google.com/maps?q=Trojani&ll=-34.2476164,-59.4730172&z=17&output=embed";

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
                Universo Trojani
              </span>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-strong)",
                  fontSize: "clamp(1.3rem, 2.2vw, 2rem)",
                  lineHeight: 1.18,
                }}
              >
                Una propuesta pensada para vestir todos los dias con identidad,
                materiales nobles y una seleccion curada de prendas que se
                sienten actuales.
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
                En Trojani trabajamos una mirada clara sobre el vestir diario:
                siluetas limpias, prendas combinables y una construccion visual
                que busca equilibrio entre presencia, comodidad y caracter.
              </p>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  lineHeight: 1.85,
                  maxWidth: 720,
                }}
              >
                La tienda esta pensada como una extension de esa identidad. Un
                espacio donde la experiencia de marca, la seleccion del
                producto y el trato cercano conviven para que descubrir la
                coleccion se sienta simple, prolijo y natural.
              </p>
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
                Pinto 690, Pergamino, Buenos Aires.
              </p>
              <a
                href="https://www.google.com/maps/place/Trojani/@-34.2476164,-59.4755921,17z/data=!3m1!4b1!4m6!3m5!1s0x95bbeb1c4ebb3e5d:0x1b47d9cff76c5744!8m2!3d-34.2476164!4d-59.4730172!16s%2Fg%2F11rgby0f4s?entry=ttu&g_ep=EgoyMDI2MDQxNS4wIKXMDSoASAFQAw%3D%3D"
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
