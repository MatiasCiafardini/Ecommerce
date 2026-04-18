import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("editorial", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];

  return (
    <footer
      style={{
        background: "#ede8e0",
        color: "#1a1410",
        borderTop: "2px solid #1a1410",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "56px 28px 64px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 36,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display, 'Times New Roman', serif)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#1a1410",
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            {layoutConfig.footer?.brandTitle || "Editorial"}
          </h3>
          <p style={{ color: "#5a5248", lineHeight: 1.8, fontSize: 14 }}>
            {layoutConfig.footer?.brandSubtitle || "Moda con intención editorial. Piezas que comunican."}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h4
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#5a5248",
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
                  style={{ color: "#5a5248", textDecoration: "none", fontSize: 14 }}
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
          borderTop: "1px solid rgba(26,20,16,0.1)",
          padding: "16px 28px",
          maxWidth: 1280,
          margin: "0 auto",
          fontSize: 11,
          color: "#5a5248",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>© {new Date().getFullYear()} Editorial. Todos los derechos reservados.</span>
      </div>
    </footer>
  );
}
