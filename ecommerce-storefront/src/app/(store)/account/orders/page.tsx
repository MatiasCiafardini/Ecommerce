import Link from "next/link";
import OrdersSection from "@/components/account/OrdersSection";

export default function AccountOrdersPage() {
  return (
    <section
      style={{
        padding: "72px 20px 96px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), #0b0b0b",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 12px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 12,
                color: "rgba(247,241,232,0.56)",
              }}
            >
              Cuenta
            </p>
            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
                lineHeight: 0.95,
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "-0.06em",
              }}
            >
              Todos tus pedidos
            </h1>
          </div>

          <Link
            href="/account"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "#f7f1e8",
              textDecoration: "none",
              padding: "12px 16px",
            }}
          >
            Volver a la cuenta
          </Link>
        </div>

        <OrdersSection mode="full" />
      </div>
    </section>
  );
}
