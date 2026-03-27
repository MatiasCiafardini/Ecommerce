import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="theme-footer-shell"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,251,247,1) 0%, rgba(243,231,218,1) 100%)",
        color: "var(--theme-colors-text-strong)",
        borderTop: "1px solid rgba(63,37,29,0.08)",
      }}
    >
      <div
        className="theme-footer-grid"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "56px 20px 64px",
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1.2fr) repeat(3, minmax(180px, 1fr))",
          gap: 24,
        }}
      >
        <div className="theme-footer-brand">
          <p
            style={{
              margin: "0 0 14px",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              fontSize: 12,
              color: "color-mix(in srgb, var(--theme-colors-text-strong) 52%, transparent)",
            }}
          >
            Estudio de prendas
          </p>
          <h3
            style={{
              fontSize: 30,
              margin: "0 0 14px",
              letterSpacing: "-0.05em",
            }}
          >
            Aurea
          </h3>
          <p style={{ color: "color-mix(in srgb, var(--theme-colors-text-strong) 74%, transparent)", lineHeight: 1.8, margin: 0, maxWidth: 360 }}>
            Siluetas suaves, tonos crema y una seleccion pensada para vestir todos
            los dias con calma y presencia.
          </p>
        </div>

        <FooterColumn
          title="Explorar"
          links={[
            { href: "/product", label: "Coleccion" },
            { href: "/category/remeras", label: "Esenciales" },
            { href: "/category/buzos", label: "Abrigos" },
          ]}
        />
        <FooterColumn
          title="Cuenta"
          links={[
            { href: "/account", label: "Mi cuenta" },
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
          ]}
        />
        <div>
          <h4 style={{ marginBottom: 12, color: "var(--theme-colors-text-strong)" }}>Atencion</h4>
          <p style={{ color: "color-mix(in srgb, var(--theme-colors-text-strong) 74%, transparent)", lineHeight: 1.8, margin: 0 }}>
            Envio a todo el pais, cambios simples y acompanamiento por mail para
            cada compra.
          </p>
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
    <div className="theme-footer-column">
      <h4 style={{ marginBottom: 12, color: "var(--theme-colors-text-strong)" }}>{title}</h4>
      <div style={{ display: "grid", gap: 8 }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ color: "color-mix(in srgb, var(--theme-colors-text-strong) 74%, transparent)", textDecoration: "none" }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
