import Image from "next/image";
import Link from "next/link";

type Props = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  logo?: string;
};

export default function BoutiqueHero({
  eyebrow = "Mi Maria Indumentaria",
  title = "Elegancia para todos los dias",
  subtitle = "Una boutique femenina de lineas suaves, tonos calidos y prendas pensadas para acompanarte con estilo en cada momento.",
  buttonText = "Ver coleccion",
  buttonLink = "/product",
  logo = "/images/mimaria/logo.png",
}: Props) {
  return (
    <section
      className="theme-block-section theme-block-section--boutique-hero"
      style={{
        padding: "36px 20px 0",
        background: "var(--page-shell-bg)",
      }}
    >
      <div
        data-boutique-hero-shell
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "clamp(32px, 5vw, 54px)",
          borderRadius: "var(--theme-radius-shell)",
          border: "1px solid var(--border-soft)",
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.9), transparent 34%), linear-gradient(135deg, rgba(255,250,246,0.96), rgba(235,221,207,0.88))",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 28,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 28px 80px rgba(117,92,76,0.08)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -100,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.4)",
            filter: "blur(6px)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -140,
            left: -40,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "rgba(135,102,80,0.08)",
          }}
        />

        <div style={{ display: "grid", alignContent: "center", gap: 20, position: "relative", zIndex: 1 }}>
          <span
            style={{
              display: "inline-flex",
              width: "fit-content",
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(117,92,76,0.14)",
              background: "rgba(255,255,255,0.54)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              fontSize: 11,
            }}
          >
            {eyebrow}
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(3rem, 7vw, 5.8rem)",
              lineHeight: 0.92,
              letterSpacing: "-0.05em",
              color: "var(--text-strong)",
              maxWidth: 680,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 580,
              color: "var(--text-muted)",
              lineHeight: 1.9,
              fontSize: "clamp(1rem, 1.4vw, 1.08rem)",
            }}
          >
            {subtitle}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href={buttonLink}
              className="theme-button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 50,
                padding: "0 24px",
                borderRadius: 999,
                background: "var(--accent-strong)",
                color: "var(--accent-contrast)",
                textDecoration: "none",
                border: "1px solid var(--accent-strong)",
                fontWeight: 700,
              }}
            >
              {buttonText}
            </Link>

            <span
              style={{
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 11,
              }}
            >
              Estilo femenino, calido y minimalista
            </span>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            minHeight: 420,
            display: "grid",
            alignContent: "center",
          }}
        >
          <div
            style={{
              justifySelf: "center",
              width: "min(100%, 460px)",
              aspectRatio: "4 / 5",
              borderRadius: "32px",
              border: "1px solid rgba(117,92,76,0.14)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.74), rgba(245,235,225,0.9))",
              boxShadow: "0 24px 60px rgba(117,92,76,0.12)",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "1fr auto",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "grid",
                placeItems: "center",
                padding: "clamp(32px, 8vw, 70px)",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: "10% 14%",
                  borderRadius: "28px",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.7), rgba(226,209,193,0.7))",
                }}
              />
              <Image
                src={logo}
                alt="Mi Maria Indumentaria"
                width={260}
                height={260}
                unoptimized
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "min(62%, 260px)",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                padding: "20px 24px 24px",
                borderTop: "1px solid rgba(117,92,76,0.1)",
                display: "grid",
                gap: 10,
                background: "rgba(255,252,248,0.72)",
              }}
            >
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Seleccion boutique
              </span>
              <strong style={{ fontSize: "clamp(1.5rem, 3vw, 2.1rem)", color: "var(--text-strong)" }}>
                Prendas pensadas para sentirte bien vestida
              </strong>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.8 }}>
                Una experiencia visual limpia y elegante, lista para seguir creciendo con tu catalogo real.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
