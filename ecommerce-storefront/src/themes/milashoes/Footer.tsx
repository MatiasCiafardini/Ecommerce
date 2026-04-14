import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("milashoes", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];

  return (
    <footer
      className="theme-footer-shell"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--theme-colors-paper) 80%, white) 0%, var(--theme-colors-background-soft) 100%)",
        color: "var(--theme-colors-text-strong)",
        borderTop: "1px solid var(--theme-colors-border)",
      }}
    >
      <div
        className="theme-footer-grid"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "54px 24px 60px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.3fr) repeat(auto-fit, minmax(180px, 1fr))",
          gap: 28,
        }}
      >
        <div className="theme-footer-brand" style={{ display: "grid", gap: 12 }}>
          <span
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 12,
              color: "var(--theme-colors-text-muted)",
            }}
          >
            Mila Shoes
          </span>
          <h3 style={{ fontSize: 28, margin: 0 }}>
            {layoutConfig.footer?.brandTitle || "Mila Shoes"}
          </h3>
          <p
            style={{
              color: "var(--theme-colors-text-muted)",
              lineHeight: 1.8,
              margin: 0,
              maxWidth: 420,
            }}
          >
            {layoutConfig.footer?.brandSubtitle ||
              "Calzado femenino de lineas limpias, materiales nobles y una seleccion pensada para usar todos los dias."}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="theme-footer-column">
            <h4 style={{ margin: "0 0 14px", color: "var(--theme-colors-text-strong)" }}>
              {column.title}
            </h4>
            <div style={{ display: "grid", gap: 10 }}>
              {column.links.map((link) => (
                <Link
                  key={`${column.title}-${link.href}-${link.label}`}
                  href={link.href}
                  style={{
                    color: "var(--theme-colors-text-muted)",
                    textDecoration: "none",
                  }}
                >
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
