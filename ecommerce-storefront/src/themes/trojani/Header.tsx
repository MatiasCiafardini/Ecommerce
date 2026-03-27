"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import NotificationsMenu from "@/components/notifications/NotificationsMenu";

const navLinkStyle = {
  color: "rgba(255,255,255,0.84)",
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
    { href: "/product", label: "Drop" },
    { href: "/category/remeras", label: "Remeras" },
    { href: "/category/buzos", label: "Buzos" },
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
          ? "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(18,18,18,0.98) 100%)"
          : "linear-gradient(180deg, rgba(24,24,24,0.94) 0%, rgba(32,32,32,0.82) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="layout-header-bar"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "16px 20px",
        }}
      >
        <Link
          href="/"
          className="theme-brand"
          onClick={() => setMenuOpen(false)}
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Image
            src="/images/trojani/logo_trojani_recortado.png"
            alt="Trojani"
            width={112}
            height={32}
            priority
            unoptimized
            style={{
              width: isMobile ? 88 : 112,
              height: "auto",
            }}
          />
        </Link>

        {!isMobile ? (
          <nav
            className="layout-header-nav"
            style={{
              fontSize: 14,
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
            color: "white",
            fontSize: 14,
            alignItems: "center",
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
            {cartCount > 0 ? (
              <span style={iconBadgeStyle}>{cartCount}</span>
            ) : null}
          </Link>

          {!isMobile ? (
            user ? (
              <>
                {manualSalesEnabled ? (
                  <Link
                    href="/manual-sales"
                    style={{ ...navLinkStyle, color: "white" }}
                  >
                    Venta manual
                  </Link>
                ) : null}
                <Link
                  href="/account"
                  style={{ ...navLinkStyle, color: "white" }}
                >
                  Cuenta
                </Link>
                <button
                  onClick={handleLogout}
                  className="theme-button"
                  style={sessionButtonStyle}
                >
                  Salir
                </button>
              </>
            ) : (
              <Link href="/login" style={{ ...navLinkStyle, color: "white" }}>
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
              background: "rgba(0,0,0,0.46)",
              zIndex: 35,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 78,
              left: 14,
              right: 14,
              zIndex: 40,
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(18,18,18,0.98), rgba(10,10,10,0.98))",
              boxShadow: "0 26px 70px rgba(0,0,0,0.38)",
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
                  color: "rgba(247,241,232,0.48)",
                }}
              >
                Navegacion
              </span>
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

            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.08)",
              }}
            />

            <div style={{ display: "grid", gap: 10 }}>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  fontSize: 11,
                  color: "rgba(247,241,232,0.48)",
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
                    onClick={() => {
                      handleLogout();
                    }}
                    className="theme-button"
                    style={{
                      ...mobileNavLinkStyle,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
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
  color: "white",
  textDecoration: "none",
  width: 46,
  height: 46,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
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
  background: "#f7f1e8",
  color: "#0b0b0b",
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
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 999,
  background: "rgba(255,255,255,0.04)",
  color: "white",
  padding: "10px 14px",
  cursor: "pointer",
} as const;

const mobileNavLinkStyle = {
  color: "#fff",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
} as const;
