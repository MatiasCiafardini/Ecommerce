"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function ProfileSection({ user }: any) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    try {
      setLoading(true);

      await api("/customers/me", {
        method: "PATCH",
        body: JSON.stringify({ phone }),
      });

      alert("Perfil actualizado");
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginTop: 20 }}>
      <h2>Perfil</h2>

      <p>Email: {user.email}</p>

      <input
        placeholder="Teléfono"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button onClick={saveProfile} disabled={loading}>
        Guardar
      </button>
    </section>
  );
}
