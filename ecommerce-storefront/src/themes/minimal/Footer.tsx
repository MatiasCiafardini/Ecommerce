import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("minimal", themeLayout);
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
          padding: "48px 20px 56px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
        }}
      >
        <div className="theme-footer-brand">
          <h3
            style={{
              fontSize: 24,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            {layoutConfig.footer?.brandTitle || "Asphalt"}
          </h3>
          <p style={{ color: "var(--theme-colors-text-muted)", lineHeight: 1.7 }}>
            {layoutConfig.footer?.brandSubtitle ||
              "Streetwear con siluetas amplias, basicos limpios y drops pensados para la ciudad."}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="theme-footer-column">
            <h4 style={{ marginBottom: 12 }}>{column.title}</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {column.links.map((link) => (
                <Link key={`${column.title}-${link.href}-${link.label}`} href={link.href} style={{ color: "color-mix(in srgb, var(--theme-colors-text-strong) 82%, transparent)", textDecoration: "none" }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
