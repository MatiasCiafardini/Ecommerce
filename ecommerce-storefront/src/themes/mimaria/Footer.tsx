import Image from "next/image";
import Link from "next/link";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Footer({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const layoutConfig = mergeThemeLayout("mimaria", themeLayout);
  const columns = layoutConfig.footer?.columns ?? [];
  return (
    <>
      <footer
      className="theme-footer-shell mimaria-footer-shell"
      style={{
        background:
          "linear-gradient(180deg, var(--page-panel-strong-bg) 0%, var(--page-shell-bg) 100%)",
        color: "var(--theme-colors-text-strong)",
        borderTop: "1px solid var(--theme-colors-border)",
        width: "100%",
        overflowX: "clip",
      }}
    >
      <div
        className="theme-footer-grid mimaria-footer-grid"
        style={{
          maxWidth: "var(--store-wide-max)",
          margin: "0 auto",
          padding: "64px 20px 70px",
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1.3fr) repeat(3, minmax(170px, 1fr))",
          gap: 24,
        }}
      >
        <div
          className="theme-footer-brand mimaria-footer-brand"
          style={{ display: "grid", gap: 14, minWidth: 0 }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 0,
                border: "1px solid rgba(183,146,98,0.18)",
                background: "#C5A87C",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              <Image
                src="/images/mimaria/logo.png"
                alt="Mi Maria Indumentaria"
                width={40}
                height={40}
                style={{ width: "auto", height: "auto", maxWidth: "76%", maxHeight: "76%" }}
              />
            </div>

            <div style={{ display: "grid", gap: 3 }}>
              <span
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Boutique femenina
              </span>
              <h3 style={{ margin: 0, fontSize: 30, letterSpacing: "-0.04em" }}>
                {layoutConfig.footer?.brandTitle || "Mi Maria"}
              </h3>
            </div>
          </div>

          <p style={{ color: "var(--text-muted)", lineHeight: 1.8, margin: 0, maxWidth: 360 }}>
            {layoutConfig.footer?.brandSubtitle ||
              "Prendas femeninas casuales y elegantes, pensadas para acompanarte con delicadeza, comodidad y estilo todos los dias."}
          </p>
        </div>
        {columns.map((column) => (
          <FooterColumn key={column.title} title={column.title} links={column.links} />
        ))}
      </div>
      </footer>

      <style jsx>{`
        .mimaria-footer-shell {
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
        }

        .mimaria-footer-grid {
          width: 100%;
        }

        .mimaria-footer-brand,
        .mimaria-footer-grid :global(.theme-footer-column) {
          min-width: 0;
        }

        @media (max-width: 920px) {
          .mimaria-footer-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
            gap: 28px 20px !important;
            padding: 48px 20px 56px !important;
          }
        }

        @media (max-width: 640px) {
          .mimaria-footer-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 24px !important;
            padding: 36px 18px 42px !important;
          }
        }
      `}</style>
    </>
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
    <div className="theme-footer-column" style={{ display: "grid", gap: 10 }}>
      <h4 style={{ margin: 0, color: "var(--theme-colors-text-strong)" }}>{title}</h4>
      <div style={{ display: "grid", gap: 8 }}>
        {links.map((link) => (
          <Link key={`${title}-${link.href}-${link.label}`} href={link.href} style={footerLinkStyle}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

const footerLinkStyle = {
  color: "var(--text-muted)",
  textDecoration: "none",
} as const;
