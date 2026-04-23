import { getServerStoreContext } from "@/lib/tenant/server-store-context";

type AboutSection = {
  label: string;
  title: string;
  paragraphs: string[];
};

type AboutPageContent = {
  brandName: string;
  sections: AboutSection[];
  locationTitle: string;
  locationLabel: string;
  locationText: string;
  mapsUrl: string;
  mapEmbedUrl: string;
};

const defaultMapQuery = encodeURIComponent("Buenos Aires, Argentina");

const ABOUT_PAGE_BY_STORE_ID: Record<number, AboutPageContent> = {
  3: {
    brandName: "Trojani",
    sections: [
      {
        label: "Nuestra historia",
        title: "Una decada dandole forma al estilo masculino",
        paragraphs: [
          "En Trojani no creemos en las soluciones magicas ni en las modas pasajeras que duran un suspiro. Creemos en el trabajo constante, en la evolucion y, sobre todo, en la ropa que habla por vos.",
          "Nacimos con una idea clara: simplificar el guardarropa del hombre moderno sin perder ni un gramo de actitud. Hoy, con casi 10 anos de trayectoria, esa idea se convirtio en una realidad solida. Caminamos junto a vos durante una decada, aprendiendo que es lo que realmente buscas cuando elegis una prenda: calidad que se banca el uso, un calce que no falla y ese diseno que te hace sentir seguro en cualquier lugar.",
        ],
      },
      {
        label: "Trayectoria que genera confianza",
        title: "Experiencia, detalle y compromiso con el buen vestir",
        paragraphs: [
          "Llegar a una decada de historia no es cuestion de suerte. Es el resultado de una obsesion por los detalles que mantenemos desde el primer dia. Durante estos anos, perfeccionamos nuestras molderias, seleccionamos las mejores materias primas y construimos una comunidad que nos elige una y otra vez.",
          "Esa es nuestra mayor medalla: la confianza de saber que cuando compras en Trojani, te llevas una prenda respaldada por anos de experiencia y compromiso con el buen vestir.",
        ],
      },
    ],
    locationTitle: "Veni a conocer nuestra tienda",
    locationLabel: "Encontranos",
    locationText: "Trojani",
    mapsUrl:
      "https://www.google.com/maps/place/Trojani/@-34.2537958,-59.4747114,898m/data=!3m1!1e3!4m6!3m5!1s0x95bbeb1c4ebb3e5d:0x1b47d9cff76c5744!8m2!3d-34.2476164!4d-59.4730172!16s%2Fg%2F11rgby0f4s?entry=ttu&g_ep=EgoyMDI2MDQyMC4wIKXMDSoASAFQAw%3D%3D",
    mapEmbedUrl:
      "https://www.google.com/maps?q=-34.2476164,-59.4730172&z=16&output=embed",
  },
  6: {
    brandName: "Mila Shoes",
    sections: [
      {
        label: "Nuestra historia",
        title: "Calzado femenino con identidad propia",
        paragraphs: [
          "En Mila Shoes creemos que el calzado es mucho mas que un accesorio: es la base de cada look, la primera impresion y el detalle que completa una personalidad. Por eso, cada par que ofrecemos esta pensado con cuidado, combinando comodidad real con una estetica limpia y contemporanea.",
          "Nacimos con una idea simple: llevar calzado de calidad a quienes buscan zapatos que duren, que se vean bien y que acompanen sin esfuerzo el ritmo del dia a dia. Seleccionamos cada modelo con criterio, priorizando materiales nobles, siluetas versatiles y terminaciones que marcan la diferencia.",
        ],
      },
      {
        label: "Nuestro compromiso",
        title: "Diseno, calidad y una seleccion que evoluciona",
        paragraphs: [
          "Trabajamos con proveedores de confianza y renovamos nuestra coleccion constantemente para que siempre encuentres algo nuevo. Botas, borcegos, sneakers y mas: cada categoria tiene su identidad, pero todas comparten el mismo estandar de calidad que nos define.",
          "Nuestra mayor satisfaccion es saber que cuando elegis un par de Mila Shoes, sabes exactamente lo que estas llevando: diseno, calidad y un estilo que no pasa de moda.",
        ],
      },
    ],
    locationTitle: "Veni a conocer nuestra tienda",
    locationLabel: "Encontranos",
    locationText: "Buenos Aires, Argentina",
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${defaultMapQuery}`,
    mapEmbedUrl: `https://www.google.com/maps?q=${defaultMapQuery}&z=14&output=embed`,
  },
};

const FALLBACK_ABOUT_PAGE: AboutPageContent = {
  brandName: "Nuestra tienda",
  sections: [
    {
      label: "Nuestra historia",
      title: "Una marca con identidad propia",
      paragraphs: [
        "Construimos esta tienda para ofrecer una experiencia de compra clara, cercana y pensada alrededor de productos que realmente vale la pena usar todos los dias.",
        "Seleccionamos cada pieza con criterio, cuidando calidad, diseno y consistencia para que cada compra mantenga el estandar que queremos representar.",
      ],
    },
  ],
  locationTitle: "Veni a conocer nuestra tienda",
  locationLabel: "Encontranos",
  locationText: "Buenos Aires, Argentina",
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${defaultMapQuery}`,
  mapEmbedUrl: `https://www.google.com/maps?q=${defaultMapQuery}&z=14&output=embed`,
};

function getAboutPageContent(storeId: number) {
  return ABOUT_PAGE_BY_STORE_ID[storeId] ?? FALLBACK_ABOUT_PAGE;
}

export default async function QuienesSomosPage() {
  const { storeId } = await getServerStoreContext();
  const content = getAboutPageContent(storeId);

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
            {content.brandName}
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
            {content.sections.map((section) => (
              <div
                key={section.label}
                style={{ display: "grid", gap: 14 }}
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
                    {section.label}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-strong)",
                      fontSize: "clamp(1.3rem, 2.2vw, 2rem)",
                      lineHeight: 1.18,
                    }}
                  >
                    {section.title}
                  </p>
                </div>

                <div style={{ display: "grid", gap: 14 }}>
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      style={{
                        margin: 0,
                        color: "var(--text-muted)",
                        lineHeight: 1.85,
                        maxWidth: 720,
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
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
                src={content.mapEmbedUrl}
                title={`Ubicacion ${content.brandName}`}
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
                {content.locationLabel}
              </span>
              <strong
                style={{
                  color: "var(--text-strong)",
                  fontSize: 24,
                  lineHeight: 1.15,
                }}
              >
                {content.locationTitle}
              </strong>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  lineHeight: 1.75,
                }}
              >
                {content.locationText}
              </p>
              <a
                href={content.mapsUrl}
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
