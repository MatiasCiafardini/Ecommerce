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

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuEntered, setMenuEntered] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollLockYRef = useRef(0);
  mergeThemeLayout("milashoes", themeLayout);

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
    { href: "/quienes-somos", label: "Informacion" },
    { href: "/donde-encontrarnos", label: "Contacto" },
  ];

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgb(235, 235, 235)", borderBottom: "1px solid #D1D1D1" }}>
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
              src="/images/milashoes/logo.jpg"
              alt="Mila Shoes"
              width={110}
              height={44}
              priority
              unoptimized
              style={{ width: isMobile ? 60 : 88, height: "auto", objectFit: "contain", display: "block" }}
            />
          </Link>

          {/* Derecha: acciones */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
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
            style={{ position: "fixed", inset: 0, background: "rgba(31,31,31,0.20)", zIndex: 35 }}
          />
          <div
            className="milashoes-menu-drawer"
            data-menu-state={menuEntered ? "open" : "closed"}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "min(88vw, 400px)",
              zIndex: 40,
              background: "#F8F8F8",
              borderRight: "1px solid #D1D1D1",
              boxShadow: "4px 0 40px rgba(31,31,31,0.10)",
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
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button type="button" onClick={closeMenu} aria-label="Cerrar menu" style={closeButtonStyle}>
                <CloseIcon />
              </button>
            </div>

            {topLevelLinks.slice(0, 3).map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenu} style={drawerLinkStyle}>
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setCategoriesOpen((c) => !c)}
              aria-expanded={categoriesOpen}
              style={drawerToggleStyle}
            >
              <span>Categorias</span>
              <ChevronIcon open={categoriesOpen} />
            </button>

            {categoriesOpen ? (
              <div style={{ display: "grid", gap: 2, padding: "0 0 4px 18px" }}>
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <Link key={cat.id} href={`/category/${cat.slug}`} onClick={closeMenu} style={drawerSubLinkStyle}>
                      {cat.name}
                    </Link>
                  ))
                ) : (
                  <span style={mutedStyle}>No hay categorias cargadas.</span>
                )}
              </div>
            ) : null}

            {topLevelLinks.slice(3).map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMenu} style={drawerLinkStyle}>
                {link.label}
              </Link>
            ))}

            <div style={{ height: 1, background: "#D1D1D1", margin: "8px 0 4px" }} />

            {authUiLocked ? (
              <span style={mutedStyle}>Cargando...</span>
            ) : user ? (
              <>
                {manualSalesEnabled ? (
                  <Link href="/manual-sales" onClick={closeMenu} style={drawerSecondaryStyle}>Venta manual</Link>
                ) : null}
                <Link href="/account" onClick={closeMenu} style={drawerSecondaryStyle}>Mi cuenta</Link>
              </>
            ) : (
              <>
                <Link href="/register" onClick={closeMenu} style={drawerSecondaryStyle}>Crear cuenta</Link>
                <Link href="/login" onClick={closeMenu} style={drawerSecondaryStyle}>Iniciar sesion</Link>
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
  border: "1px solid #D1D1D1",
  background: "#F2F2F2",
  color: "#1F1F1F",
  padding: "9px 16px",
  fontSize: 12,
  fontFamily: "inherit",
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  display: "inline-flex",
  alignItems: "center",
  cursor: "pointer",
  borderRadius: 8,
};

const iconBtnStyle = {
  color: "#1F1F1F",
  textDecoration: "none",
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid #D1D1D1",
  background: "#FFFFFF",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  position: "relative" as const,
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
  border: "1px solid #1F1F1F",
  background: "transparent",
  color: "#1F1F1F",
  textDecoration: "none",
  fontSize: 13,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const drawerLinkStyle = {
  color: "#1F1F1F",
  textDecoration: "none",
  padding: "12px 0",
  fontSize: 18,
  lineHeight: 1.35,
  letterSpacing: "0.02em",
};

const drawerToggleStyle = {
  ...drawerLinkStyle,
  width: "100%",
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left" as const,
};

const drawerSubLinkStyle = {
  color: "#4A4A4A",
  textDecoration: "none",
  padding: "8px 0",
  fontSize: 15,
  lineHeight: 1.35,
};

const drawerSecondaryStyle = {
  color: "#4A4A4A",
  textDecoration: "none",
  padding: "12px 0",
  fontSize: 16,
  lineHeight: 1.35,
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
  border: "1px solid #D1D1D1",
  background: "#F2F2F2",
  color: "#1F1F1F",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  cursor: "pointer",
};
