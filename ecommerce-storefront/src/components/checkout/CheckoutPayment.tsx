"use client";

import { useState } from "react";

export default function CheckoutPayment({
  onNext,
}: {
  onNext: (method: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <h2>Pago</h2>

      <button onClick={() => setSelected("card")}>Tarjeta</button>
      <button onClick={() => setSelected("cash")}>Efectivo</button>

      <br />

      <button disabled={!selected} onClick={() => onNext(selected!)}>
        Continuar
      </button>
    </div>
  );
}
