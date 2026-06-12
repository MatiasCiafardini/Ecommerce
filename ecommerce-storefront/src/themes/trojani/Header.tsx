"use client";

import "./styles/index.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type React from "react";
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
  const hasAdminAccess = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(
    user?.role ?? "",
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
        marginLeft: "var(--admin-sidebar-offset, 0px)",
        width: "calc(100% - var(--admin-sidebar-offset, 0px))",
        backdropFilter: isMobile ? "none" : "blur(18px)",
        background: isMobile
          ? "color-mix(in srgb, var(--page-panel-strong-bg) 98%, var(--theme-colors-background))"
          : "linear-gradient(180deg, color-mix(in srgb, var(--page-panel-strong-bg) 94%, transparent) 0%, color-mix(in srgb, var(--page-panel-bg) 82%, transparent) 100%)",
        borderBottom: "1px solid var(--theme-colors-border)",
        transition: "margin-left 180ms ease, width 180ms ease",
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
            width={isMobile ? 88 : 112}
            height={isMobile ? 25 : 32}
            priority
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
                  style={
                    link.label.toLowerCase() === "afa" ? afaNavLinkStyle : navLinkStyle
                  }
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
              top: 0,
              right: 0,
              bottom: 0,
              left: "var(--admin-sidebar-offset, 0px)",
              background:
                "color-mix(in srgb, var(--theme-colors-text-strong) 52%, transparent)",
              zIndex: 35,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(86vw, 380px)",
              maxWidth: "calc(100vw - var(--admin-sidebar-offset, 0px) - 48px)",
              minHeight: "100dvh",
              zIndex: 40,
              borderRadius: "28px 0 0 28px",
              borderLeft: "1px solid var(--theme-colors-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--page-panel-strong-bg) 96%, var(--theme-colors-background)) 0%, color-mix(in srgb, var(--page-panel-bg) 96%, var(--page-shell-bg)) 100%)",
              boxShadow: "-24px 0 70px color-mix(in srgb, var(--theme-colors-text-strong) 18%, transparent)",
              padding: 18,
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr)",
              gap: 16,
              overflow: "hidden",
              WebkitOverflowScrolling: "touch",
              animation: "trojaniMobileDrawerIn 220ms cubic-bezier(.2,.8,.2,1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                paddingBottom: 14,
                borderBottom: "1px solid var(--theme-colors-border)",
              }}
            >
              <Image
                src="/images/trojani/logo_trojani_recortado.png"
                alt={layoutConfig.header?.brandLabel || "Trojani"}
                width={96}
                height={28}
              />
              <button
                type="button"
                aria-label="Cerrar menu"
                onClick={() => setMenuOpen(false)}
                style={iconActionStyle}
              >
                <HamburgerIcon open />
              </button>
            </div>
            <div style={{ display: "grid", gap: 18, overflowY: "auto", minHeight: 0, paddingRight: 2 }}>
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
                      style={
                        link.label.toLowerCase() === "afa"
                          ? mobileAfaNavLinkStyle
                          : mobileNavLinkStyle
                      }
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

            {user && hasAdminAccess ? (
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
                  <div style={mobileAdminPanelStyle}>
                    {[
                      { href: "/account?section=admin-overview", label: "Dashboard", icon: "dashboard" },
                      { href: "/account?section=admin-products", label: "Productos", icon: "products" },
                      { href: "/account?section=admin-labels", label: "Etiquetas", icon: "labels" },
                      { href: "/account?section=admin-orders", label: "Pedidos", icon: "orders" },
                      { href: "/account?section=admin-customers", label: "Clientes", icon: "customers" },
                      { href: "/account?section=admin-shipments", label: "Envios", icon: "shipments" },
                      { href: "/account?section=admin-returns", label: "Devoluciones", icon: "returns" },
                      { href: "/account?section=admin-promotions", label: "Promociones", icon: "promotions" },
                      { href: "/account?section=admin-accounting", label: "Contabilidad", icon: "accounting" },
                      { href: "/account?section=admin-settings", label: "Configuracion", icon: "settings" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        style={mobileAdminLinkStyle}
                      >
                        <MobileAdminIcon name={item.icon} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            </div>
            <style jsx>{`
              @keyframes trojaniMobileDrawerIn {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0);
                }
              }
            `}</style>
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

function MobileAdminIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><path d="M4 13a8 8 0 0 1 16 0" /><path d="M12 13l4-5" /><path d="M7 17h10" /></>,
    products: <><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
    labels: <><path d="M4 7V4h3" /><path d="M17 4h3v3" /><path d="M20 17v3h-3" /><path d="M7 20H4v-3" /><path d="M7 8v8" /><path d="M10 8v8" /><path d="M14 8v8" /><path d="M17 8v8" /></>,
    orders: <><path d="M7 3h10v18H7z" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h4" /></>,
    customers: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    shipments: <><path d="M3 8h11v9H3z" /><path d="M14 11h4l3 3v3h-7z" /><path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></>,
    returns: <><path d="M9 7H5v4" /><path d="M5 11a7 7 0 1 0 2-5" /><path d="M12 8v5l3 2" /></>,
    promotions: <><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /></>,
    accounting: <><path d="M4 3h16v18H4z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h3" /><path d="M15 15h1" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19 12h2" /><path d="M3 12h2" /><path d="M12 3v2" /><path d="M12 19v2" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 19px" }}
    >
      {paths[name] ?? paths.dashboard}
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

const afaNavLinkStyle = {
  ...navLinkStyle,
  width: 44,
  height: 44,
  padding: 0,
  borderRadius: 999,
  background: "#75c8f0",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 0,
  boxShadow: "0 8px 18px rgba(117, 200, 240, 0.28)",
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
  padding: "12px 2px",
  borderRadius: 0,
  border: "0",
  background: "transparent",
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

const mobileAfaNavLinkStyle = {
  ...afaNavLinkStyle,
  width: 54,
  height: 54,
  justifySelf: "start",
} as const;

const mobileShopDetailsStyle = {
  borderRadius: 0,
  border: 0,
  borderBottom: "1px solid var(--theme-colors-border)",
  background: "transparent",
  overflow: "visible",
} as const;

const mobileShopSummaryStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: 0,
} as const;

const mobileShopMainLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "12px 0",
  flex: "1 1 auto",
  fontSize: 16,
  fontFamily: 'var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif)',
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 500,
} as const;

const mobileShopToggleStyle = {
  width: 44,
  minHeight: 44,
  border: "none",
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
  padding: "0 0 10px 16px",
} as const;

const mobileShopLinkStyle = {
  ...mobileNavLinkStyle,
  padding: "9px 0",
  borderRadius: 0,
  background: "transparent",
  fontSize: 14,
} as const;

const mobileSessionPlaceholderStyle = {
  ...mobileNavLinkStyle,
  color: "var(--theme-colors-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 11,
} as const;

const mobileAdminPanelStyle = {
  display: "grid",
  gap: 0,
  overflow: "visible",
  borderRadius: 0,
  border: 0,
  background: "transparent",
  boxShadow: "none",
} as const;

const mobileAdminLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  minHeight: 40,
  padding: "10px 0",
  display: "flex",
  alignItems: "center",
  gap: 12,
  borderBottom: 0,
  background: "transparent",
  fontSize: 14,
  fontFamily: 'var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif)',
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
} as const;
