"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function AddressSection() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [street, setStreet] = useState("");

  const addAddress = async () => {
    const res = await api("/addresses", {
      method: "POST",
      body: JSON.stringify({
        street,
        city: "Buenos Aires",
        country: "Argentina",
        zipCode: "1234",
      }),
    });

    setAddresses([...addresses, res]);
    setStreet("");
  };

  return (
    <section style={{ marginTop: 30 }}>
      <h2>Direcciones</h2>

      <input
        placeholder="Calle"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
      />

      <button onClick={addAddress}>Agregar</button>

      {addresses.map((a) => (
        <div key={a.id}>
          {a.street} - {a.city}
        </div>
      ))}
    </section>
  );
}
