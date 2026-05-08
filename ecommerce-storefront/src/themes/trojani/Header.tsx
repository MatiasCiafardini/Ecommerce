"use client";

import "./styles/index.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import HeaderSearch from "@/components/header/HeaderSearch";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";
import { api } from "@/lib/api";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

type HeaderProductSearchResult = {
  title?: string | null;
  slug?: string | null;
  published?: boolean;
};

const shopCategoryLinks = [
  { href: "/product?categories=buzos,camperas", label: "Abrigos" },
  { href: "/product?category=accesorios", label: "Accesorios" },
  { href: "/product?category=calzado", label: "Calzado" },
  { href: "/product?category=remeras", label: "Remeras" },
];

const afaFallbackHref = "/product/camiseta-argentina";
const afaSearchTerms = ["afa", "argentina", "camiseta", "futbol", "fútbol"];

const navLinkStyle = {
  color: "color-mix(in srgb, var(--theme-colors-text-strong) 84%, transparent)",
  textDecoration: "none",
  padding: "10px 0",
  position: "relative",
  fontSize: 17,
  fontFamily: 'var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif)',
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 500,
} as const;

export default function Header({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const { user, authUiLocked, logout } = useAuth();
  const { cart } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const sessionUiPending = authUiLocked;
  const manualSalesEnabled = Boolean(
    user?.role &&
    user.role !== "CUSTOMER" &&
    user.storeFeatures?.manualSalesEnabled,
  );
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [afaHref, setAfaHref] = useState(afaFallbackHref);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 920px)");

    const syncViewport = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setMenuOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    let active = true;

    const resolveAfaProduct = async () => {
      try {
        const responses = await Promise.all(
          afaSearchTerms.map((term) =>
            api(`/store/products?search=${encodeURIComponent(term)}`).catch(() => []),
          ),
        );

        if (!active) {
          return;
        }

        const products = responses
          .flat()
          .filter(
            (product): product is HeaderProductSearchResult =>
              Boolean(product) && typeof product === "object",
          );
        const match = products.find((product) => {
          const searchable = `${product.title ?? ""} ${product.slug ?? ""}`.toLowerCase();

          return (
            product.published !== false &&
            product.slug &&
            (searchable.includes("afa") ||
              searchable.includes("argentina") ||
              searchable.includes("camiseta"))
          );
        });

        if (match?.slug) {
          setAfaHref(`/product/${match.slug}`);
        }
      } catch {
        if (active) {
          setAfaHref(afaFallbackHref);
        }
      }
    };

    void resolveAfaProduct();

    return () => {
      active = false;
    };
  }, []);

  const layoutConfig = mergeThemeLayout("trojani", themeLayout);
  const primaryLinks = layoutConfig.header?.primaryLinks ?? [];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: isMobile ? "none" : "blur(18px)",
        background: isMobile
          ? "color-mix(in srgb, var(--page-panel-strong-bg) 98%, var(--theme-colors-background))"
          : "linear-gradient(180deg, color-mix(in srgb, var(--page-panel-strong-bg) 94%, transparent) 0%, color-mix(in srgb, var(--page-panel-bg) 82%, transparent) 100%)",
        borderBottom: "1px solid var(--theme-colors-border)",
      }}
    >
      <div
        className="layout-header-bar"
        style={{
          maxWidth: "var(--theme-layout-max-width, 1280px)",
          margin: "0 auto",
          padding: "16px 20px",
        }}
      >
        <Link
          href="/"
          className="theme-brand"
          onClick={() => setMenuOpen(false)}
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Image
            src="/images/trojani/logo_trojani_recortado.png"
            alt={layoutConfig.header?.brandLabel || "Trojani"}
            width={112}
            height={32}
            priority
            style={{
              width: isMobile ? 88 : 112,
              height: "auto",
            }}
          />
        </Link>

        {!isMobile ? (
          <nav
            className="layout-header-nav"
            style={{
              fontSize: 17,
            }}
          >
            {primaryLinks.map((link) =>
              link.label.toLowerCase() === "shop" ? (
                <div
                  key={link.href}
                  onMouseEnter={() => setShopOpen(true)}
                  onMouseLeave={() => setShopOpen(false)}
                  onFocus={() => setShopOpen(true)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setShopOpen(false);
                    }
                  }}
                  style={shopMenuWrapperStyle}
                >
                  <Link
                    href={link.href}
                    className="trojani-shop-trigger"
                    aria-haspopup="menu"
                    aria-expanded={shopOpen}
                    style={shopMenuButtonStyle}
                  >
                    {link.label}
                    <ChevronDownIcon open={shopOpen} />
                  </Link>
                  {shopOpen ? (
                    <div
                      role="menu"
                      className="trojani-shop-dropdown"
                      style={shopDropdownStyle}
                    >
                      {shopCategoryLinks.map((category) => (
                        <Link
                          key={category.href}
                          href={category.href}
                          className="trojani-shop-dropdown-link"
                          role="menuitem"
                          onClick={() => setShopOpen(false)}
                          style={shopDropdownLinkStyle}
                        >
                          {category.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.label.toLowerCase() === "afa" ? afaHref : link.href}
                  style={navLinkStyle}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        ) : null}

        <div
          className="layout-header-actions"
          style={{
            color: "var(--theme-colors-text-strong)",
            fontSize: 17,
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <HeaderSearch compact={isMobile} />
          <NotificationsMenu mobileSheet={isMobile} />

          <Link
            href="/cart"
            aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} producto${cartCount === 1 ? "" : "s"}` : ""}`}
            title="Carrito"
            style={iconActionStyle}
          >
            <CartIcon />
            {cartCount > 0 ? (
              <span style={iconBadgeStyle}>{cartCount}</span>
            ) : null}
          </Link>

          {!isMobile ? (
            sessionUiPending ? (
              <HeaderSessionPlaceholder />
            ) : user ? (
              <>
                {manualSalesEnabled ? (
                  <Link
                    href="/manual-sales"
                    style={{ ...navLinkStyle, color: "var(--theme-colors-text-strong)" }}
                  >
                    Venta manual
                  </Link>
                ) : null}
                <Link
                  href="/account"
                  aria-label="Cuenta"
                  title="Cuenta"
                  style={iconActionStyle}
                >
                  <PersonIcon />
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                style={{ ...navLinkStyle, color: "var(--theme-colors-text-strong)" }}
              >
                Ingresar
              </Link>
            )
          ) : (
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
              style={iconActionStyle}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          )}
        </div>
      </div>

      {isMobile && menuOpen ? (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.46)",
              zIndex: 35,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 78,
              left: 14,
              right: 14,
              bottom: 14,
              maxHeight: "calc(100dvh - 92px)",
              zIndex: 40,
              borderRadius: 28,
              border: "1px solid var(--header-action-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--page-panel-strong-bg) 98%, var(--page-panel-bg)) 0%, color-mix(in srgb, var(--page-panel-bg) 96%, var(--page-shell-bg)) 100%)",
              boxShadow: "0 26px 70px color-mix(in srgb, var(--theme-colors-text-strong) 10%, transparent)",
              padding: 20,
              display: "grid",
              gap: 18,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontSize: 11,
                  color: "var(--theme-colors-text-muted)",
                }}
              >
                Navegacion
              </span>
              <div style={{ display: "grid", gap: 8 }}>
                {primaryLinks.map((link) =>
                  link.label.toLowerCase() === "shop" ? (
                    <div key={link.href} style={mobileShopDetailsStyle}>
                      <div className="trojani-mobile-shop-summary" style={mobileShopSummaryStyle}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          style={mobileShopMainLinkStyle}
                        >
                          {link.label}
                        </Link>
                        <button
                          type="button"
                          aria-label="Ver categorias de Shop"
                          aria-expanded={shopOpen}
                          onClick={() => setShopOpen((current) => !current)}
                          style={mobileShopToggleStyle}
                        >
                          <ChevronDownIcon open={shopOpen} />
                        </button>
                      </div>
                      {shopOpen ? (
                        <div style={mobileShopLinksStyle}>
                        {shopCategoryLinks.map((category) => (
                          <Link
                            key={category.href}
                            href={category.href}
                            className="trojani-mobile-shop-link"
                            onClick={() => setMenuOpen(false)}
                            style={mobileShopLinkStyle}
                          >
                            {category.label}
                          </Link>
                        ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <Link
                      key={`${link.href}-${link.label}`}
                      href={link.label.toLowerCase() === "afa" ? afaHref : link.href}
                      onClick={() => setMenuOpen(false)}
                      style={mobileNavLinkStyle}
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            </div>

            <div
              style={{
                height: 1,
                background: "var(--header-action-border)",
              }}
            />

            <div style={{ display: "grid", gap: 10 }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontSize: 11,
                  color: "var(--theme-colors-text-muted)",
                }}
              >
                Cuenta
              </span>
              {sessionUiPending ? (
                <HeaderSessionPlaceholder mobile />
              ) : user ? (
                <>
                  {manualSalesEnabled ? (
                    <Link
                      href="/manual-sales"
                      onClick={() => setMenuOpen(false)}
                      style={mobileNavLinkStyle}
                    >
                      Venta manual
                    </Link>
                  ) : null}
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    style={mobileNavLinkStyle}
                  >
                    Mi cuenta
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    style={mobileNavButtonStyle}
                  >
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  style={mobileNavLinkStyle}
                >
                  Ingresar
                </Link>
              )}
            </div>

            {user && user.role && user.role !== "CUSTOMER" ? (
              <>
                <div
                  style={{
                    height: 1,
                    background: "var(--header-action-border)",
                  }}
                />
                <div style={{ display: "grid", gap: 10 }}>
                  <span
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      fontSize: 11,
                      color: "var(--theme-colors-text-muted)",
                    }}
                  >
                    Administración
                  </span>
                  <div style={{ display: "grid", gap: 8 }}>
                    {[
                      { href: "/account?section=admin-overview", label: "Resumen" },
                      { href: "/account?section=admin-accounting", label: "Contabilidad" },
                      { href: "/account?section=admin-products", label: "Productos" },
                      { href: "/account?section=admin-promotions", label: "Promociones" },
                      { href: "/account?section=admin-orders", label: "Pedidos" },
                      { href: "/account?section=admin-customers", label: "Clientes" },
                      { href: "/account?section=admin-shipments", label: "Envios" },
                      { href: "/account?section=admin-returns", label: "Devoluciones" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        style={mobileAdminLinkStyle}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </header>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <path d={open ? "M6 6l12 12" : "M4 7h16"} />
      <path d={open ? "M18 6L6 18" : "M4 12h16"} />
      {!open ? <path d="M4 17h16" /> : null}
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 7H7" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function HeaderSessionPlaceholder({ mobile = false }: { mobile?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={mobile ? mobileSessionPlaceholderStyle : sessionPlaceholderStyle}
    >
      Cargando...
    </span>
  );
}

const iconActionStyle = {
  color: "var(--header-action-color)",
  textDecoration: "none",
  width: 46,
  height: 46,
  borderRadius: 999,
  border: "1px solid var(--header-action-border)",
  background: "var(--header-action-bg)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
} as const;

const shopMenuWrapperStyle = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  paddingBottom: 12,
  marginBottom: -12,
} as const;

const shopMenuButtonStyle = {
  ...navLinkStyle,
  textDecoration: "none",
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 0,
  padding: "10px 0",
  borderRadius: 0,
  color: "var(--theme-colors-text-strong)",
} as const;

const shopDropdownStyle = {
  position: "absolute",
  top: "100%",
  left: "50%",
  transform: "translateX(-50%)",
  minWidth: 178,
  padding: 6,
  borderRadius: 14,
  border: "1px solid color-mix(in srgb, var(--theme-colors-text-strong) 12%, transparent)",
  background:
    "color-mix(in srgb, var(--theme-colors-background) 98%, var(--page-panel-strong-bg))",
  boxShadow:
    "0 20px 50px color-mix(in srgb, var(--theme-colors-text-strong) 13%, transparent)",
  display: "grid",
  gap: 2,
  zIndex: 45,
} as const;

const shopDropdownLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "11px 12px",
  borderRadius: 10,
  fontSize: 13,
  fontFamily: 'var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif)',
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
} as const;

const iconBadgeStyle = {
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  borderRadius: 999,
  background: "var(--header-action-badge-bg)",
  color: "var(--header-action-badge-color)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  position: "absolute",
  top: -4,
  right: -4,
} as const;

const sessionPlaceholderStyle = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid var(--theme-colors-border)",
  background: "var(--page-panel-bg)",
  color: "var(--theme-colors-text-muted)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 11,
} as const;

const mobileNavLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid var(--theme-colors-border)",
  background: "var(--page-panel-bg)",
  fontSize: 16,
  fontFamily: 'var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif)',
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 500,
} as const;

const mobileNavButtonStyle = {
  ...mobileNavLinkStyle,
  textAlign: "left",
  cursor: "pointer",
} as const;

const mobileShopDetailsStyle = {
  borderRadius: 18,
  border: "1px solid var(--theme-colors-border)",
  background: "var(--page-panel-bg)",
  overflow: "hidden",
} as const;

const mobileShopSummaryStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "0 0 0 16px",
} as const;

const mobileShopMainLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "14px 0",
  flex: "1 1 auto",
  fontSize: 16,
  fontFamily: 'var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif)',
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 500,
} as const;

const mobileShopToggleStyle = {
  width: 48,
  minHeight: 48,
  border: "none",
  borderLeft: "1px solid var(--theme-colors-border)",
  background: "transparent",
  color: "var(--theme-colors-text-strong)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
} as const;

const mobileShopLinksStyle = {
  display: "grid",
  gap: 6,
  padding: "0 12px 12px",
} as const;

const mobileShopLinkStyle = {
  ...mobileNavLinkStyle,
  padding: "11px 14px",
  borderRadius: 14,
  background: "color-mix(in srgb, var(--page-panel-bg) 62%, var(--page-shell-bg))",
  fontSize: 14,
} as const;

const mobileSessionPlaceholderStyle = {
  ...mobileNavLinkStyle,
  color: "var(--theme-colors-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 11,
} as const;

const mobileAdminLinkStyle = {
  ...mobileNavLinkStyle,
  background: "color-mix(in srgb, var(--page-panel-bg) 60%, var(--page-shell-bg))",
  fontSize: 14,
} as const;
