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

  const layoutConfig = mergeThemeLayout("blush", themeLayout);
  const primaryLinks = layoutConfig.header?.primaryLinks ?? [];
  const brandLabel = layoutConfig.header?.brandLabel || "Blush";

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
        background: "rgba(253,245,242,0.96)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(160,100,90,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 28px",
          height: 68,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr auto" : "auto 1fr auto",
          alignItems: "center",
          gap: 22,
        }}
      >
        <Link
          href="/"
          className="theme-brand"
          onClick={() => setMenuOpen(false)}
          style={{
            color: "#4a2e2a",
            textDecoration: "none",
            fontFamily: "var(--font-display, 'Georgia', serif)",
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: "0.12em",
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

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <HeaderSearch compact={isMobile} />
          <NotificationsMenu mobileSheet={isMobile} />

          <Link href="/cart" aria-label={`Carrito${cartCount > 0 ? `, ${cartCount}` : ""}`} style={iconStyle}>
            <CartIcon />
            {cartCount > 0 ? (
              <span style={{
                minWidth: 18, height: 18, padding: "0 5px",
                borderRadius: 999,
                background: "#c87d72", color: "#fffaf8",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600,
                position: "absolute", top: -4, right: -4,
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
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(74,46,42,0.14)", zIndex: 35 }} />
          <div
            style={{
              position: "fixed",
              top: 70,
              left: 14,
              right: 14,
              bottom: 14,
              maxHeight: "calc(100dvh - 84px)",
              zIndex: 40,
              borderRadius: 16,
              background: "#fffaf8",
              border: "1px solid rgba(160,100,90,0.12)",
              boxShadow: "0 20px 60px rgba(180,100,100,0.12)",
              padding: "22px 20px",
              display: "grid",
              gap: 4,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                {link.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(160,100,90,0.1)", margin: "10px 0" }} />
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
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d={open ? "M6 6l12 12" : "M4 7h16"} />
      <path d={open ? "M18 6L6 18" : "M4 12h16"} />
      {!open ? <path d="M4 17h16" /> : null}
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 7H7" />
    </svg>
  );
}

const navLinkStyle = {
  color: "#7a5c58",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: "0.08em",
} as const;

const iconStyle = {
  color: "#4a2e2a",
  textDecoration: "none",
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid rgba(160,100,90,0.14)",
  background: "#fffaf8",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
} as const;

const btnStyle = {
  color: "#4a2e2a",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: "0.06em",
  border: "1px solid rgba(160,100,90,0.2)",
  background: "transparent",
  padding: "9px 18px",
  borderRadius: 999,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
} as const;

const btnFilledStyle = {
  ...btnStyle,
  background: "#c87d72",
  color: "#fffaf8",
  borderColor: "#c87d72",
} as const;

const mobileLinkStyle = {
  color: "#4a2e2a",
  textDecoration: "none",
  padding: "13px 14px",
  fontSize: 14,
  fontWeight: 400,
  letterSpacing: "0.04em",
  display: "block",
  borderRadius: 10,
  border: "1px solid rgba(160,100,90,0.1)",
  background: "rgba(253,245,242,0.6)",
  marginBottom: 4,
} as const;
