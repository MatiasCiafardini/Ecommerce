import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("urban", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];

  return (
    <footer
      style={{
        background: "var(--theme-colors-background)",
        color: "var(--theme-colors-text-strong)",
        borderTop: "2px solid var(--theme-colors-accent)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "52px 24px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 28,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--theme-colors-text-strong)",
              marginBottom: 12,
            }}
          >
            {layoutConfig.footer?.brandTitle || "Urban"}
          </h3>
          <p style={{ color: "var(--theme-colors-text-muted)", lineHeight: 1.7, fontSize: 14 }}>
            {layoutConfig.footer?.brandSubtitle || "Streetwear con identidad. Drops semanales para quienes viven la ciudad."}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h4
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--theme-colors-accent)",
                marginBottom: 14,
              }}
            >
              {column.title}
            </h4>
            <div style={{ display: "grid", gap: 8 }}>
              {column.links.map((link) => (
                <Link
                  key={`${column.title}-${link.href}`}
                  href={link.href}
                  style={{
                    color: "var(--theme-colors-text-muted)",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "16px 24px",
          maxWidth: 1280,
          margin: "0 auto",
          fontSize: 11,
          color: "var(--theme-colors-text-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        © {new Date().getFullYear()} Urban. Todos los derechos reservados.
      </div>
    </footer>
  );
}
