import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("clean-white", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];

  return (
    <footer
      style={{
        background: "#f8f8f8",
        color: "#111111",
        borderTop: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "60px 32px 72px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 40,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 300,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#111111",
              marginBottom: 16,
            }}
          >
            {layoutConfig.footer?.brandTitle || "Brand"}
          </h3>
          <p style={{ color: "#888888", lineHeight: 1.8, fontSize: 13, fontWeight: 300 }}>
            {layoutConfig.footer?.brandSubtitle || "Piezas esenciales diseñadas para durar."}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h4
              style={{
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#aaaaaa",
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
                    color: "#666666",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 300,
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
          borderTop: "1px solid rgba(0,0,0,0.05)",
          padding: "16px 32px",
          maxWidth: 1400,
          margin: "0 auto",
          fontSize: 11,
          color: "#aaaaaa",
          letterSpacing: "0.08em",
        }}
      >
        © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
