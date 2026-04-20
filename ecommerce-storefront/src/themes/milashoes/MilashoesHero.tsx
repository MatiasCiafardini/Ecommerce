import Link from "next/link";
import Image from "next/image";
import { resolveAssetUrl } from "@/lib/asset-url";

type Props = {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  image?: string;
  eyebrow?: string;
};

export default function MilashoesHero({
  title = "Zapatos pensados para elevar lo simple",
  subtitle = "Botas, borcegos y sneakers con siluetas limpias para una rotacion femenina, moderna y versatil.",
  buttonText = "Ver coleccion",
  buttonLink = "/product",
  image = "/images/milashoes/hero-shoes.svg",
  eyebrow = "Nueva seleccion",
}: Props) {
  const resolvedImage = resolveAssetUrl(image) ?? image;

  return (
    <section className="theme-milashoes-hero">
      <div className="theme-milashoes-hero-shell">
        <div className="theme-milashoes-hero-copy">
          <span className="theme-milashoes-hero-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>

          <div className="theme-milashoes-hero-actions">
            <Link href={buttonLink} className="theme-milashoes-hero-button">
              {buttonText}
            </Link>
            <span className="theme-milashoes-hero-note">Envios a todo el pais</span>
          </div>
        </div>

        <div className="theme-milashoes-hero-media">
          <div className="theme-milashoes-hero-media-frame">
            <Image
              src={resolvedImage}
              alt="Coleccion de Mila Shoes"
              fill
              priority
              sizes="(max-width: 960px) 100vw, 50vw"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
