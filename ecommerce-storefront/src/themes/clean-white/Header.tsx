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

  const layoutConfig = mergeThemeLayout("clean-white", themeLayout);
  const primaryLinks = layoutConfig.header?.primaryLinks ?? [];
  const brandLabel = layoutConfig.header?.brandLabel || "Brand";

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
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 32px",
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
            color: "#111111",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 300,
            letterSpacing: "0.24em",
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
                minWidth: 16, height: 16, padding: "0 4px",
                background: "#111111", color: "#ffffff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 600,
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
              <Link href="/login" style={btnStyle}>Ingresar</Link>
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
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 35 }} />
          <div
            style={{
              position: "fixed",
              top: 65,
              left: 16,
              right: 16,
              zIndex: 40,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
              padding: "24px 20px",
              display: "grid",
              gap: 4,
            }}
          >
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                {link.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "12px 0" }} />
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
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d={open ? "M6 6l12 12" : "M4 7h16"} />
      <path d={open ? "M18 6L6 18" : "M4 12h16"} />
      {!open ? <path d="M4 17h16" /> : null}
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 7H7" />
    </svg>
  );
}

const navLinkStyle = {
  color: "#444444",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} as const;

const iconStyle = {
  color: "#111111",
  textDecoration: "none",
  width: 40,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  border: "1px solid rgba(0,0,0,0.08)",
  background: "transparent",
} as const;

const btnStyle = {
  color: "#111111",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "1px solid rgba(0,0,0,0.12)",
  background: "transparent",
  padding: "8px 16px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
} as const;

const mobileLinkStyle = {
  color: "#111111",
  textDecoration: "none",
  padding: "14px 0",
  fontSize: 13,
  fontWeight: 300,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  display: "block",
  borderBottom: "1px solid rgba(0,0,0,0.05)",
  background: "none",
} as const;
