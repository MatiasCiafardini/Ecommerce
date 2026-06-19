"use client";

const steps = [
  { number: 1, label: "Carrito" },
  { number: 2, label: "Entrega" },
  { number: 3, label: "Pago" },
  { number: 4, label: "Revision" },
];

export default function CheckoutLayout({
  children,
  step,
  onStepSelect,
  canNavigateToStep,
}: {
  children: React.ReactNode;
  step: number;
  onStepSelect?: (step: number) => void;
  canNavigateToStep?: (step: number) => boolean;
}) {
  const currentStep = steps.find((item) => item.number === step) ?? steps[0];
  const progressPercent = Math.max(0, Math.min(100, ((step - 1) / (steps.length - 1)) * 100));

  return (
    <main
      className="checkout-shell"
      style={{
        minHeight: "calc(100vh - 180px)",
        padding: "44px 24px 72px",
        background: "var(--page-shell-bg)",
      }}
    >
      <div
        className="checkout-page-grid"
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        <section
          className="checkout-progress-panel"
          style={{
            borderRadius: 28,
            border: "1px solid var(--checkout-border)",
            background: "var(--checkout-panel-strong-bg)",
            padding: "22px 24px",
            display: "grid",
            gap: 18,
            boxShadow: "0 18px 42px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="checkout-progress-heading"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "end",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.24em",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                Checkout
              </p>
              <h1
                style={{
                  margin: "8px 0 0",
                  fontSize: "clamp(2rem, 4vw, 3.6rem)",
                  letterSpacing: "-0.05em",
                  lineHeight: 0.96,
                }}
              >
                Cerra tu compra
              </h1>
            </div>
            <div
              style={{
                display: "grid",
                gap: 6,
                minWidth: 180,
                color: "var(--checkout-text-muted)",
                textAlign: "right",
              }}
            >
              <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.16em" }}>
                Paso {currentStep.number} de {steps.length}
              </span>
              <strong style={{ color: "var(--checkout-text-strong)", fontSize: 18 }}>
                {currentStep.label}
              </strong>
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              height: 6,
              borderRadius: 999,
              background: "color-mix(in srgb, var(--checkout-border) 48%, transparent)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                borderRadius: 999,
                background: "var(--checkout-primary-bg)",
                transition: "width 220ms var(--ease-theme)",
              }}
            />
          </div>

          <div
            className="checkout-steps-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {steps.map((item) => {
              const state =
                item.number === step ? "active" : item.number < step ? "done" : "idle";
              const isClickable =
                typeof onStepSelect === "function" &&
                (canNavigateToStep ? canNavigateToStep(item.number) : item.number <= step);

              return (
                <button
                  type="button"
                  key={item.number}
                  className="checkout-step-button"
                  data-state={state}
                  onClick={() => {
                    if (!isClickable) return;
                    onStepSelect?.(item.number);
                  }}
                  disabled={!isClickable}
                  style={{
                    borderRadius: 18,
                    border:
                      state === "active"
                        ? "1px solid color-mix(in srgb, var(--checkout-primary-bg) 42%, var(--checkout-border-strong))"
                        : "1px solid var(--checkout-border)",
                    background:
                      state === "active"
                        ? "color-mix(in srgb, var(--checkout-primary-bg) 14%, var(--checkout-panel-bg))"
                        : state === "done"
                          ? "var(--ghost-chip-bg)"
                          : "transparent",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    color: "var(--checkout-text-strong)",
                    cursor: isClickable ? "pointer" : "default",
                    opacity: isClickable ? 1 : 0.86,
                    minHeight: 66,
                  }}
                >
                  <div
                    className="checkout-step-badge"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background:
                        state === "active"
                          ? "var(--checkout-primary-bg)"
                          : state === "done"
                            ? "color-mix(in srgb, var(--accent) 12%, var(--paper))"
                            : "var(--ghost-chip-bg)",
                      color:
                        state === "active"
                          ? "var(--checkout-primary-color)"
                          : "var(--checkout-text-strong)",
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
                        color:
                          state === "active"
                            ? "color-mix(in srgb, var(--checkout-text-strong) 68%, transparent)"
                            : "var(--checkout-text-muted)",
                      }}
                    >
                      Paso {item.number}
                    </p>
                    <strong
                      style={{
                        display: "block",
                        marginTop: 6,
                        color: "var(--checkout-text-strong)",
                      }}
                    >
                      {item.label}
                    </strong>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div>{children}</div>
      </div>
    </main>
  );
}
