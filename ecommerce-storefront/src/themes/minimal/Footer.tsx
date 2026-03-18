import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        background:
          "linear-gradient(180deg, rgba(32,32,32,1) 0%, rgba(12,12,12,1) 100%)",
        color: "white",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "48px 20px 56px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 24,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Asphalt
          </h3>
          <p style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
            Streetwear con siluetas amplias, basicos limpios y drops pensados para
            la ciudad.
          </p>
        </div>

        <div>
          <h4 style={{ marginBottom: 12 }}>Explorar</h4>
          <div style={{ display: "grid", gap: 8 }}>
            <Link href="/product" style={{ color: "rgba(255,255,255,0.82)", textDecoration: "none" }}>
              Catalogo
            </Link>
            <Link href="/category/remeras" style={{ color: "rgba(255,255,255,0.82)", textDecoration: "none" }}>
              Remeras
            </Link>
            <Link href="/category/buzos" style={{ color: "rgba(255,255,255,0.82)", textDecoration: "none" }}>
              Buzos
            </Link>
          </div>
        </div>

        <div>
          <h4 style={{ marginBottom: 12 }}>Cuenta</h4>
          <div style={{ display: "grid", gap: 8 }}>
            <Link href="/account" style={{ color: "rgba(255,255,255,0.82)", textDecoration: "none" }}>
              Mi cuenta
            </Link>
            <Link href="/cart" style={{ color: "rgba(255,255,255,0.82)", textDecoration: "none" }}>
              Carrito
            </Link>
            <Link href="/checkout" style={{ color: "rgba(255,255,255,0.82)", textDecoration: "none" }}>
              Checkout
            </Link>
          </div>
        </div>

        <div>
          <h4 style={{ marginBottom: 12 }}>Info</h4>
          <p style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
            Envios a todo el pais. Cambios dentro de los 30 dias. Soporte por DM y
            mail.
          </p>
        </div>
      </div>
    </footer>
  );
}
