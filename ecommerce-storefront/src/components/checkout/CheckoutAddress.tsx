"use client";

import { useState } from "react";

export default function CheckoutAddress({
  onNext,
}: {
  onNext: (address: any) => void;
}) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  return (
    <div>
      <h2>Dirección</h2>

      {addresses.map((addr, i) => (
        <div key={i}>
          <p>{addr.street}</p>
          <button onClick={() => setSelected(addr)}>Seleccionar</button>
        </div>
      ))}

      <button
        onClick={() =>
          setAddresses([
            ...addresses,
            { street: "Dirección " + (addresses.length + 1) },
          ])
        }
      >
        + Agregar dirección
      </button>

      <br />

      <button disabled={!selected} onClick={() => onNext(selected)}>
        Continuar
      </button>
    </div>
  );
}
