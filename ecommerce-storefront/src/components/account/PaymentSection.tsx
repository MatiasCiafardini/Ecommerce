export default function PaymentSection() {
  return (
    <section
      data-account-panel
      style={{
        borderRadius: 32,
        border: "1px solid var(--border-soft)",
        background: "var(--page-panel-bg)",
        padding: 32,
        display: "grid",
        gap: 22,
        color: "var(--account-text-strong)",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.26em",
            fontSize: 12,
            color: "var(--account-text-soft)",
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
          Pagos en tu cuenta
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
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-strong-bg)",
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
                color: "var(--account-text-soft)",
              }}
            >
              Proximo modulo
            </p>
            <h3 style={{ margin: "12px 0 0", fontSize: 22 }}>Tarjetas guardadas</h3>
          </div>
          <p style={{ margin: 0, color: "var(--account-text-muted)", lineHeight: 1.7 }}>
            Proximamente vas a poder guardar medios de pago desde tu cuenta.
          </p>
        </article>

        <article
          style={{
            borderRadius: 24,
            border: "1px solid var(--border-soft)",
            background: "var(--page-panel-strong-bg)",
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
                color: "var(--account-text-soft)",
              }}
            >
              Estado actual
            </p>
            <h3 style={{ margin: "12px 0 0", fontSize: 22 }}>Checkout activo</h3>
          </div>
          <p style={{ margin: 0, color: "var(--account-text-muted)", lineHeight: 1.7 }}>
            Hoy puedes completar tu compra directamente desde el checkout.
          </p>
        </article>
      </div>
    </section>
  );
}
