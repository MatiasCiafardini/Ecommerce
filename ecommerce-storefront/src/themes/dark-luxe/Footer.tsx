import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("dark-luxe", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];

  return (
    <footer
      style={{
        background: "var(--theme-colors-background-soft)",
        color: "var(--theme-colors-text-strong)",
        borderTop: "1px solid rgba(200,180,140,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "56px 28px 64px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 32,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display, 'Times New Roman', serif)",
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--theme-colors-accent)",
              marginBottom: 14,
            }}
          >
            {layoutConfig.footer?.brandTitle || "Dark Luxe"}
          </h3>
          <p
            style={{
              color: "var(--theme-colors-text-muted)",
              lineHeight: 1.8,
              fontSize: 14,
            }}
          >
            {layoutConfig.footer?.brandSubtitle ||
              "Alta moda nocturna. Piezas únicas para quienes viven la elegancia sin concesiones."}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h4
              style={{
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--theme-colors-accent)",
                opacity: 0.7,
                marginBottom: 16,
              }}
            >
              {column.title}
            </h4>
            <div style={{ display: "grid", gap: 10 }}>
              {column.links.map((link) => (
                <Link
                  key={`${column.title}-${link.href}`}
                  href={link.href}
                  style={{
                    color: "var(--theme-colors-text-muted)",
                    textDecoration: "none",
                    fontSize: 14,
                    letterSpacing: "0.04em",
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
          borderTop: "1px solid rgba(200,180,140,0.08)",
          padding: "18px 28px",
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--theme-colors-text-muted)", opacity: 0.5, letterSpacing: "0.08em" }}>
          © {new Date().getFullYear()} Dark Luxe. Todos los derechos reservados.
        </span>
      </div>
    </footer>
  );
}
