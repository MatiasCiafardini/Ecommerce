"use client";

import "./styles/index.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import HeaderSearch from "@/components/header/HeaderSearch";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function Header({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const { user, logout, authUiLocked } = useAuth();
  const { cart } = useCart();
  const router = useRouter();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const manualSalesEnabled = Boolean(
    user?.role && user.role !== "CUSTOMER" && user.storeFeatures?.manualSalesEnabled,
  );
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const layoutConfig = mergeThemeLayout("dark-luxe", themeLayout);
  const primaryLinks = layoutConfig.header?.primaryLinks ?? [];
  const brandLabel = layoutConfig.header?.brandLabel || "Dark Luxe";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 920px)");
    const sync = () => { setIsMobile(mq.matches); if (!mq.matches) setMenuOpen(false); };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  const handleLogout = () => { setMenuOpen(false); logout(); router.push("/"); };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "color-mix(in srgb, var(--theme-colors-background-elevated) 88%, transparent)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(200,180,140,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "20px 28px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr auto" : "auto 1fr auto",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Link
          href="/"
          className="theme-brand"
          onClick={() => setMenuOpen(false)}
          style={{
            color: "var(--theme-colors-accent)",
            textDecoration: "none",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display, 'Times New Roman', serif)",
          }}
        >
          {brandLabel}
        </Link>

        {!isMobile ? (
          <nav style={{ display: "flex", justifyContent: "center", gap: 28 }}>
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} style={navLinkStyle}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <HeaderSearch compact={isMobile} />
          <NotificationsMenu mobileSheet={isMobile} />

          <Link
            href="/cart"
            aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} productos` : ""}`}
            style={iconStyle}
          >
            <CartIcon />
            {cartCount > 0 ? <span style={badgeStyle}>{cartCount}</span> : null}
          </Link>

          {!isMobile ? (
            authUiLocked ? (
              <span style={chipStyle}>Cargando</span>
            ) : user ? (
              <>
                {manualSalesEnabled ? <Link href="/manual-sales" style={navLinkStyle}>Venta manual</Link> : null}
                <Link href="/account" style={navLinkStyle}>Cuenta</Link>
                <button type="button" onClick={handleLogout} style={actionBtnStyle}>Salir</button>
              </>
            ) : (
              <Link href="/login" style={actionBtnStyle}>Ingresar</Link>
            )
          ) : (
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              style={iconStyle}
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
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.64)", zIndex: 35 }}
          />
          <div
            style={{
              position: "fixed",
              top: 80,
              left: 14,
              right: 14,
              bottom: 14,
              maxHeight: "calc(100dvh - 94px)",
              zIndex: 40,
              background: "var(--theme-colors-background-elevated)",
              border: "1px solid rgba(200,180,140,0.14)",
              boxShadow: "0 28px 80px rgba(0,0,0,0.6)",
              padding: 22,
              display: "grid",
              gap: 16,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <span style={sectionLabel}>Navegacion</span>
              {primaryLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={mobileLink}>
                  {link.label}
                </Link>
              ))}
            </div>
            <div style={{ height: 1, background: "rgba(200,180,140,0.1)" }} />
            <div style={{ display: "grid", gap: 8 }}>
              <span style={sectionLabel}>Cuenta</span>
              {authUiLocked ? (
                <span style={{ ...mobileLink, opacity: 0.5 }}>Cargando</span>
              ) : user ? (
                <>
                  {manualSalesEnabled ? (
                    <Link href="/manual-sales" onClick={() => setMenuOpen(false)} style={mobileLink}>Venta manual</Link>
                  ) : null}
                  <Link href="/account" onClick={() => setMenuOpen(false)} style={mobileLink}>Mi cuenta</Link>
                  <button type="button" onClick={handleLogout} style={{ ...mobileLink, cursor: "pointer", textAlign: "left" }}>Salir</button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)} style={mobileLink}>Ingresar</Link>
              )}
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d={open ? "M6 6l12 12" : "M4 7h16"} />
      <path d={open ? "M18 6L6 18" : "M4 12h16"} />
      {!open ? <path d="M4 17h16" /> : null}
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 7H7" />
    </svg>
  );
}

const navLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  opacity: 0.78,
} as const;

const iconStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  width: 44,
  height: 44,
  border: "1px solid rgba(200,180,140,0.14)",
  background: "rgba(255,255,255,0.03)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
} as const;

const badgeStyle = {
  minWidth: 18,
  height: 18,
  padding: "0 4px",
  background: "var(--theme-colors-accent)",
  color: "var(--theme-colors-background)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 700,
  position: "absolute",
  top: -4,
  right: -4,
} as const;

const actionBtnStyle = {
  color: "var(--theme-colors-accent)",
  textDecoration: "none",
  fontSize: 12,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  border: "1px solid rgba(200,180,140,0.22)",
  background: "transparent",
  padding: "10px 18px",
  cursor: "pointer",
} as const;

const chipStyle = {
  padding: "10px 14px",
  border: "1px solid rgba(200,180,140,0.14)",
  background: "transparent",
  color: "var(--theme-colors-text-muted)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} as const;

const sectionLabel = {
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  fontSize: 10,
  color: "var(--theme-colors-accent)",
  opacity: 0.7,
} as const;

const mobileLink = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "14px 16px",
  border: "1px solid rgba(200,180,140,0.1)",
  background: "rgba(255,255,255,0.02)",
  display: "block",
} as const;
