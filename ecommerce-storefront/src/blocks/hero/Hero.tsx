import { getProducts } from "@/services/products.service";
import { resolveAssetUrl } from "@/lib/asset-url";
import { getServerStoreContext } from "@/lib/tenant/server-store-context";
import HeroProductSpotlight from "@/blocks/hero/HeroProductSpotlight";
import { concreteTexture, editorialLines, urbanSkyline } from "@/themes/minimal/visuals";

type Props = {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundColor?: string;
  textColor?: string;
  image?: string;
};

export default async function Hero({
  title = "Streetwear para todos los dias",
  subtitle = "Remeras pesadas, buzos amplios y basicos con actitud urbana. Menos ruido, mas presencia.",
  buttonText = "Explorar catalogo",
  buttonLink = "/product",
  backgroundColor = "#111111",
  textColor = "white",
  image,
}: Props) {
  const [{ storeId }, products] = await Promise.all([
    getServerStoreContext(),
    getProducts({ limit: 4 }),
  ]);
  const normalizedTextColor = textColor.toLowerCase();
  const isLightText = normalizedTextColor !== "white" && normalizedTextColor !== "#fff";
  const titleColor = textColor;
  const subtitleColor = isLightText ? "rgba(35,24,21,0.74)" : "rgba(255,255,255,0.82)";
  const pillBorder = isLightText ? "rgba(35,24,21,0.16)" : "rgba(255,255,255,0.2)";
  const pillBackground = isLightText ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.05)";
  const surfaceBorder = isLightText ? "rgba(63,37,29,0.14)" : "rgba(255,255,255,0.14)";
  const surfaceText = isLightText ? "rgba(35,24,21,0.72)" : "rgba(255,255,255,0.72)";
  const tagBorder = isLightText ? "rgba(63,37,29,0.12)" : "rgba(255,255,255,0.16)";
  const tagBackground = isLightText ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.05)";
  const tagText = isLightText ? "rgba(35,24,21,0.8)" : "rgba(255,255,255,0.82)";
  const endGradientColor = isLightText ? "#fff4e8" : "#b3aba0";
  const imageOverlayStart = isLightText ? "rgba(255,248,240,0.76)" : "rgba(16,16,16,0.74)";
  const imageOverlayEnd = isLightText ? "rgba(214,190,166,0.42)" : "rgba(36,36,36,0.42)";
  const resolvedImage = resolveAssetUrl(image) ?? image;

  return (
    <section
      className="theme-ambient-pan"
      style={{
        background:
          resolvedImage
            ? `linear-gradient(135deg, ${imageOverlayStart}, ${imageOverlayEnd}), url(${resolvedImage}), ${urbanSkyline}`
            : `linear-gradient(135deg, ${backgroundColor} 0%, ${isLightText ? "#f3dfcf" : "#232323"} 48%, ${endGradientColor} 100%), ${urbanSkyline}`,
        padding: "88px 20px 20px",
        color: textColor,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        style={{
          maxWidth: "var(--store-wide-max)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 36,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              padding: "8px 12px",
              border: `1px solid ${pillBorder}`,
              borderRadius: 999,
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 20,
              background: pillBackground,
            }}
          >
            Nueva capsula 2026
          </div>

          <h1
            style={{
              fontSize: "clamp(3rem, 7vw, 6rem)",
              lineHeight: 0.95,
              marginBottom: 18,
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
              color: titleColor,
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              style={{
                fontSize: 18,
                maxWidth: 560,
                marginBottom: 28,
                color: subtitleColor,
                lineHeight: 1.7,
              }}
            >
              {subtitle}
            </p>
          )}

          {buttonText && (
            <a href={buttonLink} style={{ textDecoration: "none" }}>
              <button
                className="theme-button"
                style={{
                  background: "var(--paper)",
                  color: "var(--background)",
                  padding: "16px 24px",
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {buttonText}
              </button>
            </a>
          )}
        </div>

        <div
          className="theme-hover-lift theme-float-slow"
          style={{
            minHeight: 420,
            borderRadius: 32,
            border: `1px solid ${surfaceBorder}`,
            background:
              `linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03)), ${editorialLines}, ${concreteTexture}`,
            padding: 24,
            display: "grid",
            alignContent: "space-between",
            backgroundSize: "cover, cover, cover",
            width: "100%",
          }}
          data-hero-product-spotlight
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: surfaceText,
            }}
          >
            <span>Oversized fit</span>
            <span>Drop limitado</span>
          </div>

          <HeroProductSpotlight products={products ?? []} storeId={storeId} />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["Heavy cotton", "Wide leg", "Rotacion diaria"].map((tag) => (
              <span
                key={tag}
                style={{
                  border: `1px solid ${tagBorder}`,
                  borderRadius: 999,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: tagText,
                  background: tagBackground,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
