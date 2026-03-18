"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";

const navLinkStyle = {
  color: "rgba(255,255,255,0.84)",
  textDecoration: "none",
  padding: "10px 0",
  position: "relative",
} as const;

export default function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "blur(18px)",
        background:
          "linear-gradient(180deg, rgba(24,24,24,0.94) 0%, rgba(32,32,32,0.82) 100%)",
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
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Asphalt
        </Link>

        <nav
          className="layout-header-nav"
          style={{
            fontSize: 14,
          }}
        >
          <Link href="/" style={navLinkStyle}>
            Inicio
          </Link>
          <Link href="/product" style={navLinkStyle}>
            Drop
          </Link>
          <Link href="/category/remeras" style={navLinkStyle}>
            Remeras
          </Link>
          <Link href="/category/buzos" style={navLinkStyle}>
            Buzos
          </Link>
        </nav>

        <div
          className="layout-header-actions"
          style={{
            color: "white",
            fontSize: 14,
          }}
        >
          <Link href="/cart" style={{ ...navLinkStyle, color: "white" }}>
            Carrito ({cartCount})
          </Link>

          {user ? (
            <>
              <Link href="/account" style={{ ...navLinkStyle, color: "white" }}>
                Cuenta
              </Link>
              <button
                onClick={logout}
                className="theme-button"
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.04)",
                  color: "white",
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" style={{ ...navLinkStyle, color: "white" }}>
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
