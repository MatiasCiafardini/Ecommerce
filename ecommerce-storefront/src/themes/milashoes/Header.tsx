"use client";

import "./styles/index.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import HeaderSearch from "@/components/header/HeaderSearch";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { api } from "@/lib/api";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";
import type { StoreCategory } from "@/types/store";

export function BrandedHeader({
  themeLayout,
  themeName = "milashoes",
  logoSrc = "/images/milashoes/logo.jpg",
  logoAlt = "Mila Shoes",
  logoDesktopWidth = 88,
  logoMobileWidth = 60,
}: {
  themeLayout?: StorefrontThemeLayout;
  themeName?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoDesktopWidth?: number;
  logoMobileWidth?: number;
}) {
  const { user, authUiLocked } = useAuth();
  const { cart } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const manualSalesEnabled = Boolean(
    ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user?.role ?? "") &&
      user?.storeFeatures?.manualSalesEnabled,
  );

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuEntered, setMenuEntered] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollLockYRef = useRef(0);
  mergeThemeLayout(themeName, themeLayout);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 980px)");
    const syncViewport = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) setMenuOpen(false);
    };
    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const prev = {
      overflow: document.body.style.overflow,
      overflowY: document.body.style.overflowY,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
    };
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
      document.body.style.overflow = prev.overflow;
      document.body.style.overflowY = prev.overflowY;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      document.body.style.width = prev.width;
      if (menuMounted) window.scrollTo(0, scrollLockYRef.current);
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
      .then((res) => {
        if (!cancelled && Array.isArray(res)) setCategories(res as StoreCategory[]);
      })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  const openMenu = () => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setMenuMounted(true);
    setMenuOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setMenuEntered(true)));
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuEntered(false);
    setCategoriesOpen(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => { setMenuMounted(false); closeTimerRef.current = null; }, 320);
  };

  const handleMenuToggle = () => { if (menuOpen || menuMounted) { closeMenu(); return; } openMenu(); };

  const topLevelLinks = [
    { href: "/", label: "Inicio" },
    { href: "/product", label: "Catalogo" },
    { href: "/category/ofertas", label: "Ofertas" },
    { href: "/quienes-somos", label: "Quienes somos" },
    { href: "/guia-de-talles", label: "Guia de talles" },
    { href: "/donde-encontrarnos", label: "Contacto" },
  ];

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          marginLeft: "var(--admin-sidebar-offset, 0px)",
          width: "calc(100% - var(--admin-sidebar-offset, 0px))",
          background: "var(--theme-header-bg, rgb(235, 235, 235))",
          borderBottom: "1px solid var(--theme-header-border, rgba(31, 31, 31, 0.08))",
          backdropFilter: "blur(12px)",
          transition: "margin-left 180ms ease, width 180ms ease",
        }}
      >
        <div
          className="layout-header-bar"
          style={{
            maxWidth: "var(--store-wide-max, 1680px)",
            margin: "0 auto",
            padding: "0 24px",
            minHeight: isMobile ? 64 : 72,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
          }}
        >
          {/* Izquierda: botón menu */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <button type="button" onClick={handleMenuToggle} style={menuButtonStyle}>
              {menuOpen ? "Cerrar" : "Menu"}
            </button>
          </div>

          {/* Centro: logo plano */}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            aria-label="Ir al inicio"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
          >
            <Image
              src={logoSrc}
              alt={logoAlt}
              width={110}
              height={44}
              priority
              style={{
                width: isMobile ? logoMobileWidth : logoDesktopWidth,
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>

          {/* Derecha: acciones */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
            <HeaderSearch compact={Boolean(isMobile)} />
            <NotificationsMenu mobileSheet={isMobile ?? undefined} />

            {isMobile === false && user ? (
              <Link href="/account" aria-label="Mi cuenta" title="Mi cuenta" style={iconBtnStyle}>
                <AccountIcon />
              </Link>
            ) : null}

            <Link
              href="/cart"
              aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} producto${cartCount === 1 ? "" : "s"}` : ""}`}
              title="Carrito"
              style={iconBtnStyle}
            >
              <CartIcon />
              {cartCount > 0 ? <span style={badgeStyle}>{cartCount}</span> : null}
            </Link>

            {isMobile === false ? (
              authUiLocked ? null : user ? (
                manualSalesEnabled ? (
                  <Link href="/manual-sales" style={textLinkStyle}>Venta manual</Link>
                ) : null
              ) : (
                <Link href="/login" style={loginBtnStyle}>Ingresar</Link>
              )
            ) : null}
          </div>
        </div>
      </header>

      {menuMounted ? (
        <>
          <div
            className="milashoes-menu-overlay"
            data-menu-state={menuEntered ? "open" : "closed"}
            onClick={closeMenu}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              left: "var(--admin-sidebar-offset, 0px)",
              background: "rgba(31,31,31,0.20)",
              zIndex: 35,
            }}
          />
          <div
            className="milashoes-menu-drawer"
            data-menu-state={menuEntered ? "open" : "closed"}
            style={{
              position: "fixed",
              top: 0,
              left: "var(--admin-sidebar-offset, 0px)",
              bottom: 0,
              width: "min(88vw, 400px)",
              maxWidth: "calc(100vw - var(--admin-sidebar-offset, 0px) - 20px)",
              zIndex: 40,
              background:
                "linear-gradient(180deg, var(--theme-drawer-bg-start, #FCFCFC) 0%, var(--theme-drawer-bg-end, #F4F4F4) 100%)",
              borderRight: "1px solid var(--theme-drawer-border, rgba(31, 31, 31, 0.06))",
              boxShadow: "18px 0 48px rgba(31,31,31,0.10)",
              padding: isMobile
                ? "max(22px, env(safe-area-inset-top)) 24px calc(44px + env(safe-area-inset-bottom))"
                : "36px 28px 32px",
              display: "grid",
              alignContent: "start",
              gap: 4,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button type="button" onClick={closeMenu} aria-label="Cerrar menu" style={closeButtonStyle}>
                <CloseIcon />
              </button>
            </div>

            {topLevelLinks.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="milashoes-drawer-link"
                style={drawerLinkStyle}
              >
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setCategoriesOpen((c) => !c)}
              aria-expanded={categoriesOpen}
              data-open={categoriesOpen ? "true" : "false"}
              className="milashoes-drawer-link milashoes-drawer-toggle"
              style={drawerToggleStyle}
            >
              <span>Categorias</span>
              <ChevronIcon open={categoriesOpen} />
            </button>

            {categoriesOpen ? (
              <div className="milashoes-drawer-submenu" style={{ display: "grid", gap: 2, padding: "6px 0 6px 18px" }}>
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      onClick={closeMenu}
                      className="milashoes-drawer-sublink"
                      style={drawerSubLinkStyle}
                    >
                      {cat.name}
                    </Link>
                  ))
                ) : (
                  <span style={mutedStyle}>No hay categorias cargadas.</span>
                )}
              </div>
            ) : null}

            {topLevelLinks.slice(3).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="milashoes-drawer-link"
                style={drawerLinkStyle}
              >
                {link.label}
              </Link>
            ))}

            <div
              style={{
                height: 1,
                background: "transparent",
                margin: "6px 0 4px",
              }}
            />

            {authUiLocked ? (
              <span style={mutedStyle}>Cargando...</span>
            ) : user ? (
              <>
                {manualSalesEnabled ? (
                  <Link
                    href="/manual-sales"
                    onClick={closeMenu}
                    className="milashoes-drawer-secondary"
                    style={drawerSecondaryStyle}
                  >
                    Venta manual
                  </Link>
                ) : null}
                <Link
                  href="/account"
                  onClick={closeMenu}
                  className="milashoes-drawer-secondary"
                  style={drawerSecondaryStyle}
                >
                  Mi cuenta
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="milashoes-drawer-secondary"
                  style={drawerSecondaryStyle}
                >
                  Crear cuenta
                </Link>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="milashoes-drawer-secondary"
                  style={drawerSecondaryStyle}
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

export default function Header({
  themeLayout,
}: {
  themeLayout?: StorefrontThemeLayout;
}) {
  return <BrandedHeader themeLayout={themeLayout} />;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12" /><path d="M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 7H7" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="8" r="4" />
    </svg>
  );
}

const menuButtonStyle = {
  appearance: "none" as const,
  border: "1px solid rgba(31, 31, 31, 0.10)",
  background: "rgba(255, 255, 255, 0.72)",
  color: "#1F1F1F",
  padding: "9px 16px",
  fontSize: 12,
  fontFamily: "inherit",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  borderRadius: 999,
  boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset",
};

const iconBtnStyle = {
  color: "#1F1F1F",
  textDecoration: "none",
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid rgba(31, 31, 31, 0.08)",
  background: "rgba(255, 255, 255, 0.82)",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  position: "relative" as const,
  boxShadow: "0 1px 0 rgba(255,255,255,0.72) inset",
};

const badgeStyle = {
  minWidth: 18,
  height: 18,
  padding: "0 4px",
  borderRadius: 999,
  background: "#1F1F1F",
  color: "#ffffff",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  fontSize: 10,
  fontWeight: 700,
  position: "absolute" as const,
  top: -3,
  right: -3,
};

const textLinkStyle = {
  textDecoration: "none",
  color: "#4A4A4A",
  fontSize: 13,
  letterSpacing: "0.06em",
};

const loginBtnStyle = {
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  height: 40,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(31, 31, 31, 0.14)",
  background: "rgba(255,255,255,0.68)",
  color: "#1F1F1F",
  textDecoration: "none",
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
  boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset",
};

const drawerLinkStyle = {
  color: "#1F1F1F",
  textDecoration: "none",
  padding: "10px 14px",
  fontSize: 18,
  lineHeight: 1.35,
  letterSpacing: "0.02em",
  border: "none",
  borderRadius: 14,
  outline: "none",
};

const drawerToggleStyle = {
  ...drawerLinkStyle,
  width: "100%",
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  appearance: "none" as const,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left" as const,
  outline: "none",
  boxShadow: "none",
};

const drawerSubLinkStyle = {
  color: "#505050",
  textDecoration: "none",
  padding: "8px 12px",
  fontSize: 15,
  lineHeight: 1.35,
  borderRadius: 12,
  outline: "none",
};

const drawerSecondaryStyle = {
  color: "#4A4A4A",
  textDecoration: "none",
  padding: "10px 14px",
  fontSize: 16,
  lineHeight: 1.35,
  border: "none",
  borderRadius: 14,
  outline: "none",
};

const mutedStyle = {
  color: "#A6A6A6",
  padding: "8px 0",
  fontSize: 14,
};

const closeButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 999,
  border: "1px solid rgba(31, 31, 31, 0.10)",
  background: "rgba(255,255,255,0.78)",
  color: "#1F1F1F",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  cursor: "pointer",
  boxShadow: "0 1px 0 rgba(255,255,255,0.78) inset",
};
