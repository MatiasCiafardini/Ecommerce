import { getServerStoreContext } from "@/lib/tenant/server-store-context";

type AboutSection = {
  label: string;
  title: string;
  paragraphs: string[];
};

type StoreLocation = {
  name: string;
  address: string;
  mapsUrl: string;
};

type AboutPageContent = {
  brandName: string;
  sections: AboutSection[];
  locationTitle?: string;
  locationLabel?: string;
  locationText?: string;
  mapsUrl?: string;
  mapEmbedUrl?: string;
  locations?: StoreLocation[];
};

const defaultMapQuery = encodeURIComponent("Buenos Aires, Argentina");

const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const mapsQueryEmbedUrl = (query: string, zoom = 17) =>
  `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;

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
        title: "Quienes somos",
        paragraphs: [
          "Mila Shoes nacio hace mas de 10 anos como un emprendimiento compartido con una amiga. Con el tiempo, el proyecto evoluciono y decidi continuar este camino sola, haciendo crecer la marca hasta convertirla en lo que es hoy.",
          "Me gusta pensar Mila Shoes como una propuesta diferente, pensada para quienes buscan ese detalle especial que transforma y completa cada outfit.",
        ],
      },
    ],
  },
  7: {
    brandName: "Como Vos y Yo",
    sections: [
      {
        label: "Nuestra historia",
        title: "Hace 20 años cerca de vos",
        paragraphs: [
          "Hace 20 años acompañamos a nuestros clientes ofreciendo jeans y básicos para todas las edades. Nos caracteriza la atención cercana, el trato de siempre y la dedicación en cada detalle, porque creemos que cada persona merece sentirse cómoda y bien atendida 💕",
        ],
      },
    ],
    locationTitle: "Vení a conocer nuestros locales",
    locationLabel: "Encontranos",
    locationText:
      "Estamos en San Antonio de Areco, con dos locales sobre Alsina para que elijas el que te quede más cómodo.",
    mapEmbedUrl: mapsQueryEmbedUrl(
      "Como Vos y Yo Cuenta Conmigo Alsina San Antonio de Areco Buenos Aires Argentina",
    ),
    locations: [
      {
        name: "Como Vos y Yo",
        address: "Alsina 289, San Antonio de Areco, Buenos Aires",
        mapsUrl: mapsSearchUrl(
          "Como Vos y Yo, Alsina 289, San Antonio de Areco, Buenos Aires, Argentina",
        ),
      },
      {
        name: "Cuenta Conmigo",
        address: "Alsina 222, San Antonio de Areco, Buenos Aires",
        mapsUrl: mapsSearchUrl(
          "Cuenta Conmigo, Alsina 222, San Antonio de Areco, Buenos Aires, Argentina",
        ),
      },
    ],
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
  const hasMultipleLocations = Boolean(content.locations?.length);
  const hasLocation = hasMultipleLocations || Boolean(content.mapEmbedUrl && content.mapsUrl);

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
            gridTemplateColumns: hasLocation
              ? "minmax(0, 1fr) minmax(340px, 0.92fr)"
              : "minmax(0, 920px)",
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
              alignContent: "start",
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

          {hasLocation ? (
            <aside
              style={{
                borderRadius: 36,
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-bg)",
                overflow: hasMultipleLocations ? "visible" : "hidden",
                display: "grid",
              }}
            >
              {hasMultipleLocations ? (
                <div
                  style={{
                    padding: "clamp(22px, 3vw, 30px)",
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
                  </div>

                  <div
                    className="about-location-map about-location-map--large"
                    style={{
                      position: "relative",
                      minHeight: 300,
                      borderRadius: 24,
                      overflow: "hidden",
                      background: "var(--block-card-bg)",
                    }}
                  >
                    <iframe
                      src={content.mapEmbedUrl!}
                      title={`Ubicaciones ${content.brandName}`}
                      loading="eager"
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

                  <div style={{ display: "grid", gap: 0 }}>
                    {content.locations!.map((location, index) => (
                      <section
                        key={location.address}
                        style={{
                          display: "grid",
                          gap: 8,
                          padding:
                            index === content.locations!.length - 1
                              ? "18px 0 0"
                              : "18px 0",
                          borderTop: "1px solid var(--border-soft)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gap: 8,
                            alignContent: "center",
                            minWidth: 0,
                          }}
                        >
                          <strong
                            style={{
                              color: "var(--text-strong)",
                              fontSize: 20,
                              lineHeight: 1.2,
                            }}
                          >
                            {location.name}
                          </strong>
                          <p
                            style={{
                              margin: 0,
                              color: "var(--text-muted)",
                              lineHeight: 1.6,
                            }}
                          >
                            {location.address}
                          </p>
                          <a
                            href={location.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="theme-button"
                            style={{
                              width: "fit-content",
                              textDecoration: "none",
                              padding: "11px 15px",
                              borderRadius: 999,
                              background: "var(--text-strong)",
                              color: "var(--page-panel-bg)",
                              textTransform: "uppercase",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Abrir en Google Maps
                          </a>
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      minHeight: 320,
                      background: "var(--block-card-bg)",
                    }}
                  >
                    <iframe
                      src={content.mapEmbedUrl!}
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
                      href={content.mapsUrl!}
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
                </>
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
