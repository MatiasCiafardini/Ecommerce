export default function PaymentSection() {
  return (
    <section
      style={{
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        padding: 32,
        display: "grid",
        gap: 22,
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.26em",
            fontSize: 12,
            color: "rgba(247,241,232,0.55)",
          }}
        >
          Pagos
        </p>
        <h2
          style={{
            margin: "12px 0 0",
            fontSize: "clamp(1.8rem, 2vw, 2.4rem)",
            letterSpacing: "-0.04em",
          }}
        >
          Tu billetera va a vivir aca
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <article
          style={{
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 22,
            minHeight: 170,
            display: "grid",
            alignContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(247,241,232,0.48)",
              }}
            >
              Proximo modulo
            </p>
            <h3 style={{ margin: "12px 0 0", fontSize: 22 }}>Tarjetas guardadas</h3>
          </div>
          <p style={{ margin: 0, color: "rgba(247,241,232,0.7)", lineHeight: 1.7 }}>
            Vamos a sumar medios de pago persistidos para que comprar sea mucho
            mas rapido desde tu cuenta.
          </p>
        </article>

        <article
          style={{
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 22,
            minHeight: 170,
            display: "grid",
            alignContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(247,241,232,0.48)",
              }}
            >
              Estado actual
            </p>
            <h3 style={{ margin: "12px 0 0", fontSize: 22 }}>Checkout activo</h3>
          </div>
          <p style={{ margin: 0, color: "rgba(247,241,232,0.7)", lineHeight: 1.7 }}>
            Mientras tanto, podes elegir tarjeta o efectivo dentro del checkout
            y completar la compra sin salir del flujo.
          </p>
        </article>
      </div>
    </section>
  );
}
