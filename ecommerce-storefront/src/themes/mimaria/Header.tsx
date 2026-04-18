"use client";

import "./styles/index.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { api } from "@/lib/api";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";
import type { StoreCategory } from "@/types/store";

export default function Header({
  themeLayout,
}: {
  themeLayout?: StorefrontThemeLayout;
}) {
  const { user, authUiLocked } = useAuth();
  const { cart } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const manualSalesEnabled = Boolean(
    user?.role &&
    user.role !== "CUSTOMER" &&
    user.storeFeatures?.manualSalesEnabled,
  );

  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuEntered, setMenuEntered] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollLockYRef = useRef(0);
  mergeThemeLayout("mimaria", themeLayout);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 980px)");

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
    const previousOverflow = document.body.style.overflow;
    const previousOverflowY = document.body.style.overflowY;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousLeft = document.body.style.left;
    const previousRight = document.body.style.right;
    const previousWidth = document.body.style.width;

    if (menuMounted) {
      scrollLockYRef.current = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.overflowY = "scroll";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollLockYRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overflowY = previousOverflowY;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.left = previousLeft;
      document.body.style.right = previousRight;
      document.body.style.width = previousWidth;

      if (menuMounted) {
        window.scrollTo(0, scrollLockYRef.current);
      }
    };
  }, [menuMounted]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    api("/store/categories")
      .then((response) => {
        if (cancelled || !Array.isArray(response)) return;
        setCategories(response as StoreCategory[]);
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setMenuMounted(true);
    setMenuOpen(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMenuEntered(true));
    });
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuEntered(false);
    setCategoriesOpen(false);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setMenuMounted(false);
      closeTimerRef.current = null;
    }, 320);
  };

  const handleMenuToggle = () => {
    if (menuOpen || menuMounted) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const handleCloseMenu = () => {
    closeMenu();
  };

  const topLevelLinks = [
    { href: "/", label: "Inicio" },
    { href: "/product", label: "Catalogo" },
    { href: "/category/ofertas", label: "Ofertas" },
    { href: "/quienes-somos", label: "Informacion" },
    { href: "/donde-encontrarnos", label: "Contacto" },
  ];

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backdropFilter: "blur(18px)",
          background: "rgba(198,186,176,1)",
          borderBottom: "1px solid rgba(255, 249, 241, 0.28)",
          ["--header-action-border" as string]: "var(--theme-colors-border)",
          ["--header-action-border-active" as string]:
            "var(--theme-colors-border-strong)",
          ["--header-action-bg" as string]: "var(--theme-colors-paper)",
          ["--header-action-bg-active" as string]: "var(--theme-colors-paper)",
          ["--header-action-color" as string]:
            "var(--theme-colors-text-strong)",
        }}
      >
        <div
          className="layout-header-bar"
          style={{
            maxWidth: "var(--store-wide-max)",
            margin: "0 auto",
            padding: "18px 20px",
            position: "relative",
            minHeight: isMobile ? undefined : 84,
            display: isMobile ? undefined : "grid",
            gridTemplateColumns: isMobile ? undefined : "minmax(0, 1fr) auto",
            alignItems: isMobile ? undefined : "center",
          }}
        >
          {!isMobile ? (
            <nav
              className="layout-header-nav"
              style={{
                fontSize: 14,
                justifyContent: "flex-start",
                paddingRight: 180,
              }}
            >
              <button
                type="button"
                onClick={handleMenuToggle}
                style={navMenuButtonStyle}
              >
                {menuOpen ? "Cerrar" : "Menu"}
              </button>
            </nav>
          ) : null}

          {isMobile ? (
            <button
              type="button"
              onClick={handleMenuToggle}
              style={navMenuButtonStyle}
            >
              {menuOpen ? "Cerrar" : "Menu"}
            </button>
          ) : null}

          {!isMobile ? (
            <Link
              href="/"
              className="theme-brand mimaria-header-logo"
              onClick={() => setMenuOpen(false)}
              aria-label="Ir al inicio"
              style={{
                position: "absolute",
                left: "50%",
                bottom: -28,
                transform: "translateX(-50%)",
                width: 108,
                height: 108,
                borderRadius: "50%",
                border: "1px solid rgba(160, 141, 124, 0.2)",
                boxShadow:
                  "0 0 0 10px rgba(198,186,176,0.94), 0 16px 30px rgba(110,84,53,0.12)",
                background: "#C5A87C",
                color: "var(--theme-colors-text-strong)",
                textDecoration: "none",
                display: "grid",
                placeItems: "center",
                padding: 10,
                zIndex: 2,
                overflow: "hidden",
                transition: "none",
              }}
            >
              <Image
                src="/images/mimaria/logo.png"
                alt="Logo Mi Maria Indumentaria"
                width={88}
                height={88}
                unoptimized
                style={{
                  width: "100%",
                  height: "100%",
                  maxWidth: 84,
                  maxHeight: 84,
                  objectFit: "contain",
                  objectPosition: "center",
                  display: "block",
                  transform: "scale(1.08)",
                }}
              />
            </Link>
          ) : null}

          <div
            className="layout-header-actions"
            style={{
              marginLeft: "auto",
              justifyContent: isMobile ? undefined : "flex-end",
              paddingLeft: isMobile ? undefined : 180,
            }}
          >
            <NotificationsMenu mobileSheet={isMobile} />

          {user ? (
            <Link
              href="/account"
              aria-label="Mi cuenta"
              title="Mi cuenta"
              style={iconActionStyle}
            >
              <AccountIcon />
            </Link>
          ) : null}

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

            {isMobile ? (
              authUiLocked ? (
                <span style={placeholderStyle}>Cargando...</span>
              ) : user ? (
                <Link href="/account" style={sessionButtonStyle}>
                  Mi cuenta
                </Link>
              ) : (
                <Link href="/login" style={sessionButtonStyle}>
                  Ingresar
                </Link>
              )
          ) : authUiLocked ? (
            <span style={placeholderStyle}>Cargando...</span>
          ) : user ? (
            <>
              {manualSalesEnabled ? (
                <Link href="/manual-sales" style={utilityLinkStyle}>
                  Venta manual
                </Link>
              ) : null}
            </>
          ) : (
            <Link href="/login" style={sessionButtonStyle}>
              Ingresar
              </Link>
            )}
          </div>
        </div>

        <style jsx>{`
          .mimaria-header-logo:hover,
          .mimaria-header-logo:focus,
          .mimaria-header-logo:focus-visible,
          .mimaria-header-logo:active {
            background: #c5a87c !important;
            border-color: rgba(160, 141, 124, 0.2) !important;
            box-shadow:
              0 0 0 10px rgba(198, 186, 176, 0.94),
              0 16px 30px rgba(110, 84, 53, 0.12) !important;
            opacity: 1 !important;
            filter: none !important;
            transform: translateX(-50%) !important;
          }
        `}</style>

      </header>

      {menuMounted ? (
        <>
          <div
            className="mimaria-menu-overlay"
            data-menu-state={menuEntered ? "open" : "closed"}
            onClick={handleCloseMenu}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(95,69,41,0.14)",
              zIndex: 35,
            }}
          />

          <div
            className="mimaria-menu-drawer"
            data-menu-state={menuEntered ? "open" : "closed"}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "min(88vw, 420px)",
              zIndex: 40,
              background: "rgba(255, 251, 246, 0.98)",
              borderRight: "1px solid rgba(183,146,98,0.16)",
              boxShadow: "0 26px 70px rgba(110,84,53,0.16)",
              padding: isMobile
                ? "max(22px, env(safe-area-inset-top)) 24px calc(44px + env(safe-area-inset-bottom))"
                : "36px 28px 32px",
              display: "grid",
              alignContent: "start",
              gap: 10,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={handleCloseMenu}
                style={menuCloseButtonStyle}
              >
                <CloseIcon />
              </button>
            </div>

            {topLevelLinks.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleCloseMenu}
                className="mimaria-menu-link"
                style={drawerLinkStyle}
              >
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setCategoriesOpen((current) => !current)}
              className="mimaria-menu-link mimaria-menu-toggle"
              aria-expanded={categoriesOpen}
              style={drawerToggleStyle}
            >
              <span>Categorias</span>
              <ChevronIcon open={categoriesOpen} />
            </button>

            {categoriesOpen ? (
              <div
                className="mimaria-menu-submenu"
                data-scrollable={categories.length > 16 ? "true" : "false"}
                style={drawerSubmenuStyle}
              >
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.slug}`}
                      onClick={handleCloseMenu}
                      className="mimaria-menu-sublink"
                      style={drawerSubmenuLinkStyle}
                    >
                      {category.name}
                    </Link>
                  ))
                ) : (
                  <span style={mobileMutedStyle}>
                    No hay categorias cargadas.
                  </span>
                )}
              </div>
            ) : null}

            {topLevelLinks.slice(3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleCloseMenu}
                className="mimaria-menu-link"
                style={drawerLinkStyle}
              >
                {link.label}
              </Link>
            ))}

            <div style={drawerDividerStyle} />

            {authUiLocked ? (
              <span style={mobileMutedStyle}>Cargando...</span>
            ) : user ? (
              <>
                {manualSalesEnabled ? (
                  <Link
                    href="/manual-sales"
                    onClick={handleCloseMenu}
                    className="mimaria-menu-secondary"
                    style={drawerSecondaryLinkStyle}
                  >
                    Venta manual
                  </Link>
                ) : null}
                <Link
                  href="/account"
                  onClick={handleCloseMenu}
                  className="mimaria-menu-secondary"
                  style={drawerSecondaryLinkStyle}
                >
                  Mi cuenta
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={handleCloseMenu}
                  className="mimaria-menu-secondary"
                  style={drawerSecondaryLinkStyle}
                >
                  Crear cuenta
                </Link>
                <Link
                  href="/login"
                  onClick={handleCloseMenu}
                  className="mimaria-menu-secondary"
                  style={drawerSecondaryLinkStyle}
                >
                  Iniciar sesion
                </Link>
              </>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

function CloseIcon() {
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
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M6 9l6 6 6-6" />
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

function AccountIcon() {
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
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

const navMenuButtonStyle = {
  appearance: "none",
  border: "none",
  background: "rgba(255, 249, 241, 0.18)",
  color: "var(--theme-colors-accent-contrast)",
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  borderRadius: 10,
  minHeight: 42,
} as const;

const utilityLinkStyle = {
  textDecoration: "none",
  color: "var(--theme-colors-text-strong)",
  padding: "10px 0",
  fontSize: 13,
} as const;

const iconActionStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  width: 46,
  height: 46,
  borderRadius: 999,
  border: "1px solid rgba(160, 141, 124, 0.18)",
  background: "#f1ebe4",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  boxShadow: "0 10px 28px rgba(117,92,76,0.08)",
} as const;

const iconBadgeStyle = {
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  borderRadius: 999,
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  position: "absolute",
  top: -4,
  right: -4,
} as const;

const sessionButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(160, 141, 124, 0.2)",
  background: "#f1ebe4",
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  cursor: "pointer",
} as const;

const placeholderStyle = {
  padding: "10px 14px",
  borderRadius: 0,
  border: "1px solid rgba(117,92,76,0.12)",
  background: "rgba(255,255,255,0.36)",
  color: "var(--text-muted)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 11,
} as const;

const mobileMutedStyle = {
  color: "var(--text-muted)",
  textDecoration: "none",
  padding: "12px 0",
  fontSize: 16,
  lineHeight: 1.5,
} as const;

const drawerLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "12px 0",
  fontSize: 18,
  lineHeight: 1.35,
} as const;

const drawerToggleStyle = {
  ...drawerLinkStyle,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
} as const;

const drawerSubmenuStyle = {
  display: "grid",
  gap: 2,
  padding: "0 0 4px 18px",
  minWidth: 0,
} as const;

const drawerSubmenuLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "8px 0",
  fontSize: 16,
  lineHeight: 1.35,
} as const;

const drawerDividerStyle = {
  height: 1,
  background: "rgba(117,92,76,0.12)",
  margin: "8px 0 4px",
} as const;

const drawerSecondaryLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "12px 0",
  fontSize: 17,
  lineHeight: 1.35,
} as const;

const menuCloseButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 0,
  border: "none",
  background: "transparent",
  color: "var(--theme-colors-text-strong)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
} as const;
