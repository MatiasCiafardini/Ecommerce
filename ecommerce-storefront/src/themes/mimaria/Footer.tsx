import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="theme-footer-shell"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,251,247,1) 0%, rgba(239,228,216,1) 100%)",
        color: "var(--theme-colors-text-strong)",
        borderTop: "1px solid rgba(117,92,76,0.1)",
      }}
    >
      <div
        className="theme-footer-grid"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "64px 20px 70px",
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1.3fr) repeat(3, minmax(170px, 1fr))",
          gap: 24,
        }}
      >
        <div className="theme-footer-brand" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                border: "1px solid rgba(117,92,76,0.12)",
                background: "rgba(255,255,255,0.74)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              <Image
                src="/images/mimaria/logo.png"
                alt="Mi Maria Indumentaria"
                width={40}
                height={40}
                unoptimized
                style={{ width: "auto", height: "auto", maxWidth: "76%", maxHeight: "76%" }}
              />
            </div>

            <div style={{ display: "grid", gap: 3 }}>
              <span
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Boutique femenina
              </span>
              <h3 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.04em" }}>
                Mi Maria
              </h3>
            </div>
          </div>

          <p style={{ color: "var(--text-muted)", lineHeight: 1.8, margin: 0, maxWidth: 360 }}>
            Prendas femeninas casuales y elegantes, pensadas para acompanarte con
            delicadeza, comodidad y estilo todos los dias.
          </p>
        </div>

        <FooterColumn
          title="Comprar"
          links={[
            { href: "/product", label: "Coleccion completa" },
            { href: "/category/blusas", label: "Blusas" },
            { href: "/category/vestidos", label: "Vestidos" },
          ]}
        />

        <FooterColumn
          title="Ayuda"
          links={[
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
            { href: "/account", label: "Mi cuenta" },
          ]}
        />

        <div className="theme-footer-column" style={{ display: "grid", gap: 10 }}>
          <h4 style={{ margin: 0, color: "var(--theme-colors-text-strong)" }}>Contacto</h4>
          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.8 }}>
            Atencion personalizada, envios a todo el pais y acompanamiento durante
            toda tu compra.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            <a href="https://instagram.com" style={footerLinkStyle}>
              Instagram
            </a>
            <a href="https://wa.me" style={footerLinkStyle}>
              WhatsApp
            </a>
            <a href="mailto:hola@mimaria.com" style={footerLinkStyle}>
              hola@mimaria.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="theme-footer-column" style={{ display: "grid", gap: 10 }}>
      <h4 style={{ margin: 0, color: "var(--theme-colors-text-strong)" }}>{title}</h4>
      <div style={{ display: "grid", gap: 8 }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} style={footerLinkStyle}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

const footerLinkStyle = {
  color: "var(--text-muted)",
  textDecoration: "none",
} as const;
