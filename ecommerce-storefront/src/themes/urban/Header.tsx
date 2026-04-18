"use client";

import "./styles/index.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  const layoutConfig = mergeThemeLayout("urban", themeLayout);
  const primaryLinks = layoutConfig.header?.primaryLinks ?? [];
  const brandLabel = layoutConfig.header?.brandLabel || "Urban";

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
        background: "var(--theme-colors-background)",
        borderBottom: "2px solid var(--theme-colors-accent)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
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
            color: "var(--theme-colors-text-strong)",
            textDecoration: "none",
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {brandLabel}
        </Link>

        {!isMobile ? (
          <nav style={{ display: "flex", justifyContent: "center", gap: 0 }}>
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} style={navLinkStyle}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <NotificationsMenu mobileSheet={isMobile} />

          <Link href="/cart" aria-label={`Carrito${cartCount > 0 ? `, ${cartCount}` : ""}`} style={iconStyle}>
            <CartIcon />
            {cartCount > 0 ? <span style={badgeStyle}>{cartCount}</span> : null}
          </Link>

          {!isMobile ? (
            authUiLocked ? (
              <span style={chipStyle}>...</span>
            ) : user ? (
              <>
                {manualSalesEnabled ? <Link href="/manual-sales" style={navLinkStyle}>Venta manual</Link> : null}
                <Link href="/account" style={navLinkStyle}>Cuenta</Link>
                <button type="button" onClick={handleLogout} style={accentBtnStyle}>Salir</button>
              </>
            ) : (
              <Link href="/login" style={accentBtnStyle}>Ingresar</Link>
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
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 35 }} />
          <div
            style={{
              position: "fixed",
              top: 62,
              left: 0,
              right: 0,
              zIndex: 40,
              background: "var(--theme-colors-background)",
              borderBottom: "2px solid var(--theme-colors-accent)",
              padding: "20px 24px",
              display: "grid",
              gap: 0,
            }}
          >
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                {link.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />
            {authUiLocked ? (
              <span style={{ ...mobileLinkStyle, opacity: 0.4 }}>Cargando...</span>
            ) : user ? (
              <>
                {manualSalesEnabled ? (
                  <Link href="/manual-sales" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Venta manual</Link>
                ) : null}
                <Link href="/account" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Mi cuenta</Link>
                <button type="button" onClick={handleLogout} style={{ ...mobileLinkStyle, cursor: "pointer", textAlign: "left" }}>Salir</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} style={mobileAccentLink}>Ingresar</Link>
            )}
          </div>
        </>
      ) : null}
    </header>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d={open ? "M6 6l12 12" : "M4 7h16"} />
      <path d={open ? "M18 6L6 18" : "M4 12h16"} />
      {!open ? <path d="M4 17h16" /> : null}
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "0 16px",
  height: 60,
  display: "inline-flex",
  alignItems: "center",
  borderRight: "1px solid rgba(255,255,255,0.06)",
} as const;

const iconStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  width: 44,
  height: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent",
} as const;

const badgeStyle = {
  minWidth: 18,
  height: 18,
  padding: "0 4px",
  background: "var(--theme-colors-accent)",
  color: "var(--theme-colors-accent-contrast)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 900,
  position: "absolute",
  top: -4,
  right: -4,
} as const;

const accentBtnStyle = {
  background: "var(--theme-colors-accent)",
  color: "var(--theme-colors-accent-contrast)",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "10px 18px",
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
} as const;

const chipStyle = {
  padding: "10px 14px",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "var(--theme-colors-text-muted)",
  fontSize: 11,
} as const;

const mobileLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "16px 0",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  display: "block",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "none",
} as const;

const mobileAccentLink = {
  ...mobileLinkStyle,
  color: "var(--theme-colors-accent)",
} as const;
