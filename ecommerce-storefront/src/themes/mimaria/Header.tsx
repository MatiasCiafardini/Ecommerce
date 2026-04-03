"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/product", label: "Coleccion" },
  { href: "/category/blusas", label: "Blusas" },
  { href: "/category/vestidos", label: "Vestidos" },
  { href: "/category/tapados", label: "Tapados" },
];

export default function Header() {
  const { user, logout, authUiLocked } = useAuth();
  const { cart } = useCart();
  const router = useRouter();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const manualSalesEnabled = Boolean(
    user?.role &&
      user.role !== "CUSTOMER" &&
      user.storeFeatures?.manualSalesEnabled,
  );

  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

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
        backdropFilter: "blur(18px)",
        background:
          "linear-gradient(180deg, rgba(198,186,176,0.94) 0%, rgba(188,176,166,0.92) 100%)",
        borderBottom: "1px solid rgba(133,116,103,0.18)",
        ["--header-action-border" as string]: "rgba(160, 141, 124, 0.18)",
        ["--header-action-border-active" as string]: "rgba(160, 141, 124, 0.24)",
        ["--header-action-bg" as string]: "#f1ebe4",
        ["--header-action-bg-active" as string]: "#ece4db",
        ["--header-action-color" as string]: "var(--theme-colors-text-strong)",
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
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} style={navLinkStyle}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {isMobile ? (
          <Link
            href="/"
            className="theme-brand"
            onClick={() => setMenuOpen(false)}
            style={{
              color: "var(--theme-colors-text-strong)",
              textDecoration: "none",
              fontWeight: 600,
              letterSpacing: "0.02em",
              textTransform: "none",
            }}
          >
            Mi Maria Indumentaria
          </Link>
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

          <Link
            href="/account"
            aria-label="Mi cuenta"
            title="Mi cuenta"
            style={iconActionStyle}
          >
            <AccountIcon />
          </Link>

          <Link
            href="/cart"
            aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} producto${cartCount === 1 ? "" : "s"}` : ""}`}
            title="Carrito"
            style={iconActionStyle}
          >
            <CartIcon />
            {cartCount > 0 ? <span style={iconBadgeStyle}>{cartCount}</span> : null}
          </Link>

          {isMobile ? (
            <button
              type="button"
              aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
              style={iconActionStyle}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
          ) : authUiLocked ? (
            <span style={placeholderStyle}>Cargando...</span>
          ) : user ? (
            <>
              {manualSalesEnabled ? (
                <Link href="/manual-sales" style={utilityLinkStyle}>
                  Venta manual
                </Link>
              ) : null}
              <button type="button" onClick={handleLogout} style={sessionButtonStyle}>
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" style={sessionButtonStyle}>
              Ingresar
            </Link>
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
              background: "rgba(95,69,41,0.14)",
              zIndex: 35,
            }}
          />

          <div
            style={{
              position: "fixed",
              top: 88,
              left: 14,
              right: 14,
              zIndex: 40,
              borderRadius: 0,
              border: "1px solid rgba(183,146,98,0.18)",
              background:
                "linear-gradient(180deg, rgba(255,250,245,0.98), rgba(244,234,220,0.98))",
              boxShadow: "0 26px 70px rgba(110,84,53,0.12)",
              padding: 22,
              display: "grid",
              gap: 18,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <span style={sectionLabelStyle}>Navegacion</span>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={mobileLinkStyle}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div style={{ height: 1, background: "rgba(117,92,76,0.08)" }} />

            <div style={{ display: "grid", gap: 8 }}>
              <span style={sectionLabelStyle}>Cuenta</span>
              {authUiLocked ? (
                <span style={mobileMutedStyle}>Cargando...</span>
              ) : user ? (
                <>
                  {manualSalesEnabled ? (
                    <Link
                      href="/manual-sales"
                      onClick={() => setMenuOpen(false)}
                      style={mobileLinkStyle}
                    >
                      Venta manual
                    </Link>
                  ) : null}
                  <Link href="/account" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                    Mi cuenta
                  </Link>
                  <button type="button" onClick={handleLogout} style={mobileButtonStyle}>
                    Salir
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </>
      ) : null}

      <style jsx>{`
        .mimaria-header-logo:hover,
        .mimaria-header-logo:focus,
        .mimaria-header-logo:focus-visible,
        .mimaria-header-logo:active {
          background: #C5A87C !important;
          border-color: rgba(160, 141, 124, 0.2) !important;
          box-shadow: 0 0 0 10px rgba(198, 186, 176, 0.94),
            0 16px 30px rgba(110, 84, 53, 0.12) !important;
          opacity: 1 !important;
          filter: none !important;
          transform: translateX(-50%) !important;
        }
      `}</style>
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

const navLinkStyle = {
  textDecoration: "none",
  color: "var(--theme-colors-text-strong)",
  padding: "10px 16px",
  fontSize: 14,
  borderRadius: 999,
  border: "1px solid rgba(160, 141, 124, 0.18)",
  background: "#f1ebe4",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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

const sectionLabelStyle = {
  textTransform: "uppercase",
  letterSpacing: "0.22em",
  fontSize: 11,
  color: "var(--text-muted)",
} as const;

const mobileLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: 0,
  border: "1px solid rgba(117,92,76,0.08)",
  background: "rgba(255,255,255,0.7)",
} as const;

const mobileButtonStyle = {
  ...mobileLinkStyle,
  cursor: "pointer",
  textAlign: "left",
} as const;

const mobileMutedStyle = {
  ...mobileLinkStyle,
  color: "var(--text-muted)",
} as const;
