import Image from "next/image";
import Link from "next/link";
import springHero from "../../../public/images/comovosyyo/hero-primavera.png";

export default function ComoVosYYoHero() {
  return (
    <section aria-label="Colección primavera de Como Vos y Yo">
      <Link href="/product" style={{ display: "block" }}>
        <Image
          src={springHero}
          alt="Como Vos y Yo. Indumentaria femenina. La primavera se viste de vos. Ver colección."
          priority
          sizes="100vw"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </Link>
    </section>
  );
}
