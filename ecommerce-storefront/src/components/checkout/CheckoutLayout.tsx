"use client";

export default function CheckoutLayout({
  children,
  step,
}: {
  children: React.ReactNode;
  step: number;
}) {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Checkout</h1>
      <p>Paso {step} de 4</p>

      <div style={{ marginTop: "20px" }}>{children}</div>
    </div>
  );
}
