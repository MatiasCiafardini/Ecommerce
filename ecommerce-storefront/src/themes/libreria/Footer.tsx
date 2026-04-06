import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("libreria", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];
  return (
    <footer
      className="theme-footer-shell"
      style={{
        background:
          "linear-gradient(180deg, var(--page-panel-strong-bg) 0%, var(--page-shell-bg) 100%)",
        color: "var(--theme-colors-text-strong)",
        borderTop: "1px solid var(--theme-colors-border)",
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
            Tienda de cercania
          </p>
          <h3
            style={{
              fontSize: 30,
              margin: "0 0 14px",
              letterSpacing: "-0.05em",
            }}
          >
            {layoutConfig.footer?.brandTitle || "Libreria Papelera"}
          </h3>
          <p
            style={{
              color: "color-mix(in srgb, var(--theme-colors-text-strong) 74%, transparent)",
              lineHeight: 1.8,
              margin: 0,
              maxWidth: 360,
            }}
          >
            {layoutConfig.footer?.brandSubtitle ||
              "Libros, utiles escolares, golosinas y cotillon pensados para resolver compras rapidas, fechas especiales y vuelta al cole."}
          </p>
        </div>
        {columns.map((column) => (
          <FooterColumn key={column.title} title={column.title} links={column.links} />
        ))}
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
            key={`${title}-${link.href}-${link.label}`}
            href={link.href}
            style={{
              color: "color-mix(in srgb, var(--theme-colors-text-strong) 74%, transparent)",
              textDecoration: "none",
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
