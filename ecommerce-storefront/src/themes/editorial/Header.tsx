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

  const layoutConfig = mergeThemeLayout("editorial", themeLayout);
  const primaryLinks = layoutConfig.header?.primaryLinks ?? [];
  const brandLabel = layoutConfig.header?.brandLabel || "Editorial";

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
        background: "#f4f0ea",
        borderBottom: "2px solid #1a1410",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 28px",
          height: 64,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr auto" : "auto 1fr auto",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Link
          href="/"
          className="theme-brand"
          onClick={() => setMenuOpen(false)}
          style={{
            color: "#1a1410",
            textDecoration: "none",
            fontFamily: "var(--font-display, 'Times New Roman', serif)",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            textTransform: "uppercase",
          }}
        >
          {brandLabel}
        </Link>

        {!isMobile ? (
          <nav style={{ display: "flex", justifyContent: "center", gap: 32 }}>
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} style={navLinkStyle}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <NotificationsMenu mobileSheet={isMobile} />

          <Link href="/cart" aria-label={`Carrito${cartCount > 0 ? `, ${cartCount}` : ""}`} style={iconStyle}>
            <CartIcon />
            {cartCount > 0 ? (
              <span style={{
                minWidth: 16, height: 16, padding: "0 3px",
                background: "#1a1410", color: "#f4f0ea",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700,
                position: "absolute", top: -3, right: -3,
              }}>
                {cartCount}
              </span>
            ) : null}
          </Link>

          {!isMobile ? (
            authUiLocked ? null : user ? (
              <>
                {manualSalesEnabled ? <Link href="/manual-sales" style={navLinkStyle}>Venta manual</Link> : null}
                <Link href="/account" style={navLinkStyle}>Cuenta</Link>
                <button type="button" onClick={handleLogout} style={btnStyle}>Salir</button>
              </>
            ) : (
              <Link href="/login" style={btnFilledStyle}>Ingresar</Link>
            )
          ) : (
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar" : "Menu"}
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
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(244,240,234,0.6)", zIndex: 35 }} />
          <div
            style={{
              position: "fixed",
              top: 66,
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: "calc(100dvh - 66px)",
              zIndex: 40,
              background: "#f4f0ea",
              borderBottom: "2px solid #1a1410",
              padding: "20px 28px",
              display: "grid",
              gap: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                {link.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(26,20,16,0.1)", margin: "12px 0" }} />
            {authUiLocked ? null : user ? (
              <>
                {manualSalesEnabled ? <Link href="/manual-sales" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Venta manual</Link> : null}
                <Link href="/account" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Mi cuenta</Link>
                <button type="button" onClick={handleLogout} style={{ ...mobileLinkStyle, cursor: "pointer", textAlign: "left" }}>Salir</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Ingresar</Link>
            )}
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
  color: "#5a5248",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} as const;

const iconStyle = {
  color: "#1a1410",
  textDecoration: "none",
  width: 42,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  border: "1px solid rgba(26,20,16,0.18)",
  background: "transparent",
} as const;

const btnStyle = {
  color: "#1a1410",
  textDecoration: "none",
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  border: "1px solid rgba(26,20,16,0.2)",
  background: "transparent",
  padding: "9px 16px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
} as const;

const btnFilledStyle = {
  ...btnStyle,
  background: "#1a1410",
  color: "#f4f0ea",
} as const;

const mobileLinkStyle = {
  color: "#1a1410",
  textDecoration: "none",
  padding: "16px 0",
  fontSize: 14,
  fontWeight: 400,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  display: "block",
  borderBottom: "1px solid rgba(26,20,16,0.08)",
  background: "none",
} as const;
