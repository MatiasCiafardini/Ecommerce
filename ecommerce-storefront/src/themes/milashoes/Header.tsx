"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { mergeThemeLayout } from "@/lib/tenant/theme-layout-defaults";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

const navLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  fontSize: 13,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
} as const;

export default function Header({ themeLayout }: { themeLayout?: StorefrontThemeLayout }) {
  const { user, logout, authUiLocked } = useAuth();
  const { cart } = useCart();
  const router = useRouter();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const sessionUiPending = authUiLocked;
  const manualSalesEnabled = Boolean(
    user?.role &&
      user.role !== "CUSTOMER" &&
      user.storeFeatures?.manualSalesEnabled,
  );

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

  const layoutConfig = mergeThemeLayout("milashoes", themeLayout);
  const primaryLinks = layoutConfig.header?.primaryLinks ?? [];
  const brandLabel = layoutConfig.header?.brandLabel || "Mila Shoes";

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/");
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background:
          "color-mix(in srgb, var(--theme-colors-background-elevated) 92%, transparent)",
        backdropFilter: "blur(22px)",
        borderBottom: "1px solid var(--theme-colors-border)",
      }}
    >
      <div
        className="layout-header-bar"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "18px 24px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr auto" : "auto 1fr auto",
          alignItems: "center",
          gap: 18,
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
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {brandLabel}
        </Link>

        {!isMobile ? (
          <nav
            className="layout-header-nav"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
            }}
          >
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} style={navLinkStyle}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div
          className="layout-header-actions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            marginLeft: "auto",
          }}
        >
          <NotificationsMenu mobileSheet={isMobile} />

          <Link
            href="/cart"
            aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} producto${cartCount === 1 ? "" : "s"}` : ""}`}
            title="Carrito"
            style={iconActionStyle}
          >
            <CartIcon />
            {cartCount > 0 ? <span style={iconBadgeStyle}>{cartCount}</span> : null}
          </Link>

          {!isMobile ? (
            sessionUiPending ? (
              <span style={sessionChipStyle}>Cargando</span>
            ) : user ? (
              <>
                {manualSalesEnabled ? (
                  <Link href="/manual-sales" style={navLinkStyle}>
                    Venta manual
                  </Link>
                ) : null}
                <Link href="/account" style={navLinkStyle}>
                  Cuenta
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="theme-button"
                  style={actionButtonStyle}
                >
                  Salir
                </button>
              </>
            ) : (
              <Link href="/login" style={navLinkStyle}>
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
              background: "rgba(22,19,17,0.24)",
              zIndex: 35,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 82,
              left: 16,
              right: 16,
              zIndex: 40,
              borderRadius: 0,
              border: "1px solid var(--theme-colors-border)",
              background: "rgba(255,253,250,0.98)",
              boxShadow: "0 28px 80px rgba(0,0,0,0.08)",
              padding: 20,
              display: "grid",
              gap: 18,
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <span style={mobileSectionLabelStyle}>Navegacion</span>
              <div style={{ display: "grid", gap: 8 }}>
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    style={mobileNavLinkStyle}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: "var(--theme-colors-border)" }} />

            <div style={{ display: "grid", gap: 10 }}>
              <span style={mobileSectionLabelStyle}>Cuenta</span>
              {sessionUiPending ? (
                <span style={mobileNavLinkStyle}>Cargando</span>
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
                    onClick={handleLogout}
                    className="theme-button"
                    style={{ ...mobileNavLinkStyle, textAlign: "left", cursor: "pointer" }}
                  >
                    Salir
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
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d={open ? "M6 6l12 12" : "M4 7h16"} />
      <path d={open ? "M18 6L6 18" : "M4 12h16"} />
      {!open ? <path d="M4 17h16" /> : null}
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

const iconActionStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  width: 44,
  height: 44,
  borderRadius: 0,
  border: "1px solid var(--theme-colors-border)",
  background: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
} as const;

const iconBadgeStyle = {
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  borderRadius: 0,
  background: "#000000",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  position: "absolute",
  top: -4,
  right: -4,
} as const;

const actionButtonStyle = {
  border: "1px solid var(--theme-colors-border)",
  borderRadius: 0,
  background: "#ffffff",
  color: "#000000",
  padding: "10px 16px",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontSize: 12,
} as const;

const sessionChipStyle = {
  padding: "10px 14px",
  borderRadius: 0,
  border: "1px solid var(--theme-colors-border)",
  background: "#ffffff",
  color: "var(--theme-colors-text-muted)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontSize: 11,
} as const;

const mobileSectionLabelStyle = {
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 11,
  color: "var(--theme-colors-text-muted)",
} as const;

const mobileNavLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: 0,
  border: "1px solid var(--theme-colors-border)",
  background: "#ffffff",
} as const;
