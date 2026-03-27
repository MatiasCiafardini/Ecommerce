"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";

const navLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "10px 0",
  position: "relative",
} as const;

export default function Header() {
  const { user, logout } = useAuth();
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

  const primaryLinks = [
    { href: "/", label: "Inicio" },
    { href: "/product", label: "Catalogo" },
    { href: "/product", label: "Escolar" },
    { href: "/product", label: "Fiestas" },
  ];

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
        backdropFilter: isMobile ? "none" : "blur(18px)",
        background: isMobile
          ? "linear-gradient(180deg, rgba(255,252,254,0.98) 0%, rgba(255,241,246,0.98) 100%)"
          : "linear-gradient(180deg, rgba(255,252,254,0.92) 0%, rgba(255,241,246,0.88) 100%)",
        borderBottom: "1px solid rgba(109,67,85,0.08)",
      }}
    >
      <div
        className="layout-header-bar"
        style={{
          maxWidth: 1280,
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
            {primaryLinks.map((link) => (
              <Link key={`${link.label}-${link.href}`} href={link.href} style={navLinkStyle}>
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
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Libreria Papelera
          </Link>
        ) : null}

        {!isMobile ? (
          <Link
            href="/"
            className="theme-brand libreria-header-logo"
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
              border: "1px solid rgba(109,67,85,0.12)",
              boxShadow:
                "0 0 0 10px rgba(255,248,251,0.96), 0 16px 30px rgba(207,132,163,0.16)",
              background: "#fffdfd",
              color: "var(--theme-colors-text-strong)",
              textDecoration: "none",
              display: "grid",
              placeItems: "center",
              padding: 10,
              textAlign: "center",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontSize: 11,
              lineHeight: 1.25,
              zIndex: 2,
              overflow: "hidden",
              transition: "none",
            }}
          >
            <Image
              src="/images/libreria/logo_solja_transparente.png"
              alt="Logo Libreria Papelera"
              width={88}
              height={88}
              style={{
                width: "100%",
                height: "100%",
                maxWidth: 88,
                maxHeight: 88,
                objectFit: "contain",
                objectPosition: "center",
                display: "block",
                transform: "scale(1.14)",
                filter: "contrast(1.05)",
              }}
            />
          </Link>
        ) : null}

        <div
          className="layout-header-actions"
          style={{
            color: "var(--theme-colors-text-strong)",
            fontSize: 14,
            alignItems: "center",
            marginLeft: "auto",
            justifyContent: isMobile ? undefined : "flex-end",
            paddingLeft: isMobile ? undefined : 180,
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
            user ? (
              <>
                {manualSalesEnabled ? (
                  <Link href="/manual-sales" style={navLinkStyle}>
                    Venta manual
                  </Link>
                ) : null}
                <Link href="/account" style={navLinkStyle}>
                  Cuenta
                </Link>
                <button onClick={handleLogout} className="theme-button" style={sessionButtonStyle}>
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
              background: "rgba(109,67,85,0.16)",
              zIndex: 35,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 82,
              left: 14,
              right: 14,
              zIndex: 40,
              borderRadius: 28,
              border: "1px solid rgba(109,67,85,0.1)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,244,248,0.98))",
              boxShadow: "0 26px 70px rgba(207,132,163,0.16)",
              padding: 20,
              display: "grid",
              gap: 18,
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontSize: 11,
                  color: "color-mix(in srgb, var(--theme-colors-text-strong) 54%, transparent)",
                }}
              >
                Navegacion
              </span>
              <div style={{ display: "grid", gap: 8 }}>
                {primaryLinks.map((link) => (
                  <Link
                    key={`${link.label}-mobile-${link.href}`}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    style={mobileNavLinkStyle}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(109,67,85,0.08)" }} />

            <div style={{ display: "grid", gap: 10 }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontSize: 11,
                  color: "color-mix(in srgb, var(--theme-colors-text-strong) 54%, transparent)",
                }}
              >
                Cuenta
              </span>
              {user ? (
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
                    onClick={handleLogout}
                    className="theme-button"
                    style={{ ...mobileNavLinkStyle, textAlign: "left", cursor: "pointer" }}
                  >
                    Salir
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle}>
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </>
      ) : null}

      <style jsx>{`
        .libreria-header-logo:hover,
        .libreria-header-logo:focus,
        .libreria-header-logo:focus-visible,
        .libreria-header-logo:active {
          background: #fffdfd !important;
          border-color: rgba(109, 67, 85, 0.12) !important;
          box-shadow: 0 0 0 10px rgba(255, 248, 251, 0.96),
            0 16px 30px rgba(207, 132, 163, 0.16) !important;
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
      strokeWidth="1.9"
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
  width: 46,
  height: 46,
  borderRadius: 999,
  border: "1px solid rgba(109,67,85,0.12)",
  background: "rgba(255,255,255,0.82)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
} as const;

const iconBadgeStyle = {
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  borderRadius: 999,
  background: "#cf84a3",
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

const sessionButtonStyle = {
  border: "1px solid rgba(109,67,85,0.14)",
  borderRadius: 999,
  background: "rgba(255,255,255,0.88)",
  color: "var(--theme-colors-text-strong)",
  padding: "10px 14px",
  cursor: "pointer",
} as const;

const mobileNavLinkStyle = {
  color: "var(--theme-colors-text-strong)",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid rgba(109,67,85,0.08)",
  background: "rgba(255,255,255,0.76)",
} as const;
