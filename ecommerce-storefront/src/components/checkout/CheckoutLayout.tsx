"use client";

const steps = [
  { number: 1, label: "Carrito" },
  { number: 2, label: "Direccion" },
  { number: 3, label: "Envio y pago" },
  { number: 4, label: "Revision" },
];

export default function CheckoutLayout({
  children,
  step,
}: {
  children: React.ReactNode;
  step: number;
}) {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 180px)",
        padding: "72px 24px 96px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at top right, rgba(243,238,231,0.2), transparent 24%), linear-gradient(180deg, #1a1a1a 0%, #0b0b0b 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          display: "grid",
          gap: 28,
        }}
      >
        <section
          style={{
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(243,238,231,0.12), rgba(255,255,255,0.04))",
            padding: "30px 32px",
            display: "grid",
            gap: 24,
            boxShadow: "0 24px 50px rgba(0,0,0,0.18)",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.28em",
                fontSize: 12,
                color: "rgba(247,241,232,0.52)",
              }}
            >
              Checkout
            </p>
            <h1
              style={{
                margin: "12px 0 0",
                fontSize: "clamp(2.6rem, 5vw, 4.8rem)",
                letterSpacing: "-0.07em",
              }}
            >
              Cerra la compra sin perder el ritmo
            </h1>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {steps.map((item) => {
              const state =
                item.number === step ? "active" : item.number < step ? "done" : "idle";

              return (
                <div
                  key={item.number}
                  style={{
                    borderRadius: 22,
                    border:
                      state === "active"
                        ? "1px solid rgba(255,255,255,0.2)"
                        : "1px solid rgba(255,255,255,0.08)",
                    background:
                      state === "active"
                        ? "rgba(243,238,231,0.18)"
                        : state === "done"
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.02)",
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: state === "active" ? "#f7f1e8" : "rgba(255,255,255,0.08)",
                      color: state === "active" ? "#0b0b0b" : "#f7f1e8",
                      fontWeight: 700,
                    }}
                  >
                    {item.number}
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.18em",
                        color: "rgba(247,241,232,0.48)",
                      }}
                    >
                      Paso {item.number}
                    </p>
                    <strong style={{ display: "block", marginTop: 6 }}>
                      {item.label}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div>{children}</div>
      </div>
    </main>
  );
}
