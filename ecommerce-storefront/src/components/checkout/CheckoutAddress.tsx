"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

type Address = {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  zip: string;
  country: string;
};

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--checkout-border)",
  background: "var(--checkout-field-bg)",
  color: "var(--checkout-field-color)",
} as const;

export default function CheckoutAddress({
  onNext,
}: {
  onNext: (address: Address) => void;
}) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    address1: "",
    city: "Buenos Aires",
    zip: "",
    country: "Argentina",
  });

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const data = await api("/customer-addresses/me");
        setAddresses(data);
        if (data.length > 0) {
          setSelected(data[0]);
        }
      } catch {
        setAddresses([]);
      }
    };

    loadAddresses();
  }, []);

  const saveAddress = async () => {
    try {
      setSaving(true);
      const address = await api("/customer-addresses/me", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          phone: user?.phone ?? undefined,
        }),
      });

      setAddresses((prev) => [address, ...prev]);
      setSelected(address);
      setForm((prev) => ({ ...prev, address1: "", zip: "" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="layout-two-col"
      style={{
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
      }}
    >
      <div
        style={{
          borderRadius: 32,
          border: "1px solid var(--checkout-border)",
          background: "var(--checkout-panel-bg)",
          padding: 28,
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              fontSize: 12,
              color: "var(--checkout-text-muted)",
            }}
          >
            Direccion de envio
          </p>
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(2rem, 3vw, 3rem)",
              color: "var(--checkout-text-strong)",
            }}
          >
            Elegi donde llega el pedido
          </h2>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {addresses.length === 0 ? (
            <div
              style={{
                borderRadius: 22,
                border: "1px dashed var(--checkout-border-strong)",
                background: "var(--checkout-card-alt-bg)",
                padding: 22,
                color: "var(--checkout-text-muted)",
                lineHeight: 1.8,
              }}
            >
              No hay direcciones guardadas todavia. Podes crear una a la derecha y
              seguir con la compra.
            </div>
          ) : (
            addresses.map((addr) => {
              const active = selected?.id === addr.id;

              return (
                <button
                  key={addr.id}
                  onClick={() => setSelected(addr)}
                  className="checkout-select-card"
                  data-active={active ? "true" : "false"}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 24,
                    border: active
                      ? "1px solid var(--checkout-border-strong)"
                      : "1px solid var(--checkout-border)",
                    background: active ? "var(--checkout-card-alt-bg)" : "var(--checkout-card-bg)",
                    padding: 22,
                    cursor: "pointer",
                    color: "var(--checkout-text-strong)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      fontSize: 11,
                      color: active ? "var(--checkout-text-strong)" : "var(--checkout-text-muted)",
                    }}
                  >
                    {active ? "Seleccionada" : "Disponible"}
                  </p>
                  <h3
                    style={{
                      margin: "10px 0 8px",
                      fontSize: 22,
                      color: "var(--checkout-text-strong)",
                    }}
                  >
                    {addr.firstName} {addr.lastName}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--checkout-text-muted)",
                      lineHeight: 1.7,
                    }}
                  >
                    {addr.address1}
                    <br />
                    {addr.city}, {addr.country}
                    <br />
                    CP {addr.zip}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <aside
        className="layout-sidebar"
        style={{
          borderRadius: 32,
          border: "1px solid var(--checkout-border)",
          background: "var(--checkout-panel-bg)",
          padding: 28,
          display: "grid",
          gap: 18,
          alignSelf: "start",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              fontSize: 12,
              color: "var(--checkout-text-muted)",
            }}
          >
            Nueva direccion
          </p>
          <h3 style={{ margin: "12px 0 0", fontSize: 28, color: "var(--checkout-text-strong)" }}>
            Suma una alternativa
          </h3>
        </div>

        <div className="layout-form-two">
          <input
            placeholder="Nombre"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            style={fieldStyle}
          />
          <input
            placeholder="Apellido"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            style={fieldStyle}
          />
        </div>

        <input
          placeholder="Direccion"
          value={form.address1}
          onChange={(e) => setForm({ ...form, address1: e.target.value })}
          style={fieldStyle}
        />

        <div className="layout-form-two">
          <input
            placeholder="Ciudad"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            style={fieldStyle}
          />
          <input
            placeholder="Codigo postal"
            value={form.zip}
            onChange={(e) => setForm({ ...form, zip: e.target.value })}
            style={fieldStyle}
          />
        </div>

        <input
          placeholder="Pais"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          style={fieldStyle}
        />

        <button
          onClick={saveAddress}
          disabled={saving}
          style={{
            border: "1px solid var(--checkout-border)",
            borderRadius: 999,
            background: "var(--checkout-secondary-bg)",
            color: "var(--checkout-secondary-color)",
            padding: "14px 18px",
            cursor: "pointer",
          }}
        >
          {saving ? "Guardando..." : "Agregar direccion"}
        </button>

        <button
          disabled={!selected}
          onClick={() => selected && onNext(selected)}
          style={{
            border: "none",
            borderRadius: 999,
            background: selected ? "var(--checkout-primary-bg)" : "var(--checkout-card-alt-bg)",
            color: selected ? "var(--checkout-primary-color)" : "var(--checkout-text-muted)",
            padding: "15px 18px",
            fontWeight: 700,
            cursor: selected ? "pointer" : "not-allowed",
          }}
        >
          Continuar con esta direccion
        </button>
      </aside>
    </section>
  );
}
