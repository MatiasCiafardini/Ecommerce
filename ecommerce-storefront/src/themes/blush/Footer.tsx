import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("blush", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];

  return (
    <footer
      style={{
        background: "#f7ece6",
        color: "#4a2e2a",
        borderTop: "1px solid rgba(160,100,90,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "56px 28px 64px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 32,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display, 'Georgia', serif)",
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: "0.1em",
              color: "#4a2e2a",
              marginBottom: 14,
            }}
          >
            {layoutConfig.footer?.brandTitle || "Blush"}
          </h3>
          <p style={{ color: "#7a5c58", lineHeight: 1.8, fontSize: 14 }}>
            {layoutConfig.footer?.brandSubtitle || "Moda femenina con alma. Prendas que acompañan cada momento."}
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
                color: "#c87d72",
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
                  style={{ color: "#7a5c58", textDecoration: "none", fontSize: 14 }}
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
          borderTop: "1px solid rgba(160,100,90,0.08)",
          padding: "16px 28px",
          maxWidth: 1280,
          margin: "0 auto",
          fontSize: 12,
          color: "#7a5c58",
          opacity: 0.7,
        }}
      >
        © {new Date().getFullYear()} Blush. Todos los derechos reservados.
      </div>
    </footer>
  );
}
