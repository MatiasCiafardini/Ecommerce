"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/context/auth-context";

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

type AddressForm = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  zip: string;
  country: string;
};

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f7f1e8",
} as const;

export default function AddressSection({ user }: { user: User }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<AddressForm>({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
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
      } catch {
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      address1: "",
      city: "Buenos Aires",
      zip: "",
      country: "Argentina",
    });
  };

  const saveAddress = async () => {
    try {
      setSaving(true);

      const payload = {
        ...form,
        phone: user.phone ?? undefined,
      };

      if (editingId) {
        const updated = await api(`/customer-addresses/me/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        setAddresses((prev) =>
          prev.map((address) => (address.id === editingId ? updated : address)),
        );
      } else {
        const created = await api("/customer-addresses/me", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setAddresses((prev) => [created, ...prev]);
      }

      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (address: Address) => {
    setEditingId(address.id);
    setIsCreating(false);
    setForm({
      firstName: address.firstName,
      lastName: address.lastName,
      address1: address.address1,
      city: address.city,
      zip: address.zip,
      country: address.country,
    });
  };

  const startCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      address1: "",
      city: "Buenos Aires",
      zip: "",
      country: "Argentina",
    });
  };

  const removeAddress = async (addressId: number) => {
    await api(`/customer-addresses/me/${addressId}`, {
      method: "DELETE",
    });

    setAddresses((prev) => prev.filter((address) => address.id !== addressId));

    if (editingId === addressId) {
      resetForm();
    }
  };

  const showForm = isCreating || editingId !== null;

  return (
    <section
      data-account-panel
      style={{
        borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        padding: "32px",
        display: "grid",
        gap: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          flexWrap: "wrap",
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
            Direcciones
          </p>
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(1.8rem, 2vw, 2.4rem)",
              letterSpacing: "-0.04em",
            }}
          >
            Tus puntos de entrega
          </h2>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(247,241,232,0.72)",
              fontSize: 13,
            }}
          >
            {addresses.length} guardada{addresses.length === 1 ? "" : "s"}
          </div>

          {!showForm ? (
            <button
              onClick={startCreate}
              style={{
                borderRadius: 999,
                border: "none",
                background: "#f7f1e8",
                color: "#0b0b0b",
                padding: "12px 16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Agregar nueva
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={showForm ? "layout-two-col" : undefined}
        style={
          showForm
            ? { gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)" }
            : undefined
        }
      >
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: showForm
              ? "1fr"
              : "repeat(auto-fit, minmax(280px, 1fr))",
            alignItems: "start",
          }}
        >
          {loading ? (
            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                padding: 24,
                color: "rgba(247,241,232,0.66)",
              }}
            >
              Cargando direcciones...
            </div>
          ) : addresses.length === 0 ? (
            <div
              style={{
                borderRadius: 24,
                border: "1px dashed rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.02)",
                padding: 28,
                color: "rgba(247,241,232,0.68)",
                lineHeight: 1.7,
              }}
            >
              Todavia no tenes direcciones guardadas. Agrega una para acelerar el
              checkout y mantener tu cuenta mas ordenada.
            </div>
          ) : (
            addresses.map((address, index) => (
              <article
                key={address.id}
                style={{
                  borderRadius: 24,
                  border:
                    editingId === address.id
                      ? "1px solid rgba(255,255,255,0.22)"
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    editingId === address.id
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.03)",
                  padding: 24,
                  display: "grid",
                  gap: 18,
                  minHeight: 260,
                  alignContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        textTransform: "uppercase",
                        letterSpacing: "0.22em",
                        fontSize: 11,
                        color: "rgba(247,241,232,0.5)",
                      }}
                    >
                      Direccion {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 style={{ margin: "10px 0 6px", fontSize: 22 }}>
                      {address.firstName} {address.lastName}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        color: "rgba(247,241,232,0.72)",
                        lineHeight: 1.7,
                      }}
                    >
                      {address.address1}
                      <br />
                      {address.city}, {address.country}
                      <br />
                      CP {address.zip}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => startEdit(address)}
                      style={{
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "transparent",
                        color: "#f7f1e8",
                        padding: "10px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => removeAddress(address.id)}
                      style={{
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(247,241,232,0.88)",
                        padding: "10px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {showForm ? (
          <div
            className="layout-sidebar"
            data-account-panel
            style={{
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(8,8,8,0.66)",
              padding: 24,
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
                  letterSpacing: "0.22em",
                  fontSize: 11,
                  color: "rgba(247,241,232,0.5)",
                }}
              >
                {editingId ? "Editar direccion" : "Nueva direccion"}
              </p>
              <h3 style={{ margin: "10px 0 0", fontSize: 24 }}>
                {editingId ? "Actualiza tus datos" : "Suma una nueva ubicacion"}
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

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={saveAddress}
                disabled={saving}
                style={{
                  flex: 1,
                  minWidth: 180,
                  border: "none",
                  borderRadius: 999,
                  background: "#f7f1e8",
                  color: "#0b0b0b",
                  padding: "14px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar direccion"}
              </button>

              <button
                onClick={resetForm}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#f7f1e8",
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              borderRadius: 28,
              border: "1px dashed rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.02)",
              padding: 24,
              marginTop: 12,
              color: "rgba(247,241,232,0.66)",
              lineHeight: 1.7,
              alignSelf: "start",
              display: "grid",
              gap: 10,
            }}
          >
            <strong style={{ color: "#fff", fontSize: 18 }}>
              Tus direcciones guardadas
            </strong>
            <span>
              Elegi una direccion para editarla o usa el boton{" "}
              <strong style={{ color: "#fff" }}>Agregar nueva</strong> para cargar
              otra.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
