import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("trojani", themeLayout);
  const columns = (layoutConfig.footer?.columns ?? []).filter(
    (col) => col.title.toLowerCase() !== "info",
  );
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
          maxWidth: "var(--theme-layout-max-width, 1280px)",
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
            {layoutConfig.footer?.brandTitle || "Trojani"}
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
                <Link
                  key={`${column.title}-${link.href}-${link.label}`}
                  href={link.href}
                  style={{ color: "color-mix(in srgb, var(--theme-colors-text-strong) 82%, transparent)", textDecoration: "none" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="theme-footer-column">
          <h4 style={{ marginBottom: 16 }}>Info</h4>
          <div className="trojani-footer-social">
            <a
              href="https://www.instagram.com/trojani1/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Trojani"
              className="trojani-footer-social-icon"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

