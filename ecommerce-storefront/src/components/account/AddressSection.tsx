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
  document: string;
  streetName: string;
  streetNumber: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--checkout-border, var(--border-soft))",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  outline: "none",
} as const;

const normalizeDocumentDigits = (value: string) => value.replace(/\D/g, "");
const isValidDocument = (value: string) => normalizeDocumentDigits(value).length >= 7;
const buildStreetAddress = (streetName: string, streetNumber: string) =>
  [streetName.trim(), streetNumber.trim()].filter(Boolean).join(" ");
const splitStreetAddress = (address1: string) => {
  const value = address1.trim();
  const match = value.match(/^(.*?)(\d{1,6})(?:\s+(.*))?$/);

  if (!match) {
    return { streetName: value, streetNumber: "" };
  }

  return {
    streetName: match[1]?.trim() ?? "",
    streetNumber: match[2]?.trim() ?? "",
  };
};

export default function AddressSection({ user }: { user: User }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<AddressForm>({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    document: user.document ?? "",
    streetName: "",
    streetNumber: "",
    address2: "",
    city: "Buenos Aires",
    state: "Buenos Aires",
    zip: "",
    country: "Argentina",
  });
  const effectiveDocument = user.document?.trim() || form.document.trim();
  const canSaveAddress =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.streetName.trim() &&
    form.streetNumber.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.zip.trim() &&
    isValidDocument(effectiveDocument);

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
      document: user.document ?? "",
      streetName: "",
      streetNumber: "",
      address2: "",
      city: "Buenos Aires",
      state: "Buenos Aires",
      zip: "",
      country: "Argentina",
    });
  };

  const saveAddress = async () => {
    try {
      setSaving(true);

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: user.phone ?? undefined,
        address1: buildStreetAddress(form.streetName, form.streetNumber),
        address2: form.address2.trim() || undefined,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: "Argentina",
      };

      if (!user.document?.trim() && form.document.trim()) {
        await api("/auth/me", {
          method: "PATCH",
          body: JSON.stringify({ document: form.document.trim() }),
        });
      }

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
    const street = splitStreetAddress(address.address1);
    setEditingId(address.id);
    setIsCreating(false);
      setForm({
        firstName: address.firstName,
        lastName: address.lastName,
        document: user.document ?? "",
        streetName: street.streetName,
        streetNumber: street.streetNumber,
        address2: address.address2 ?? "",
        city: address.city,
        state: address.state ?? "",
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
      document: user.document ?? "",
      streetName: "",
      streetNumber: "",
      address2: "",
      city: "Buenos Aires",
      state: "Buenos Aires",
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
        border: "1px solid var(--border-soft)",
        background: "var(--page-panel-bg)",
        padding: "32px",
        display: "grid",
        gap: 28,
        color: "var(--account-text-strong)",
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
              color: "var(--account-text-soft)",
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
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-strong-bg)",
              color: "var(--account-text-muted)",
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
                background: "var(--accent-strong)",
                color: "var(--accent-contrast)",
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
                border: "1px solid var(--border-soft)",
                background: "var(--page-panel-strong-bg)",
                padding: 24,
                color: "var(--account-text-muted)",
              }}
            >
              Cargando direcciones...
            </div>
          ) : addresses.length === 0 ? (
            <div
              style={{
                borderRadius: 24,
                border: "1px dashed var(--border-soft)",
                background: "var(--page-panel-strong-bg)",
                padding: 28,
                color: "var(--account-text-muted)",
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
                      ? "1px solid var(--border-strong)"
                      : "1px solid var(--border-soft)",
                  background:
                    editingId === address.id
                      ? "var(--page-panel-bg)"
                      : "var(--page-panel-strong-bg)",
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
                        color: "var(--account-text-soft)",
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
                        color: "var(--account-text-muted)",
                        lineHeight: 1.7,
                      }}
                    >
                      {address.address1}
                      {address.address2 ? (
                        <>
                          <br />
                          {address.address2}
                        </>
                      ) : null}
                      <br />
                      {[address.city, address.state].filter(Boolean).join(", ")}
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
                        border: "1px solid var(--border-soft)",
                        background: "transparent",
                        color: "var(--account-text-strong)",
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
                        border: "1px solid var(--border-soft)",
                        background: "var(--page-panel-bg)",
                        color: "var(--account-text-strong)",
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
              border: "1px solid var(--border-soft)",
              background: "var(--page-panel-strong-bg)",
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
                  color: "var(--account-text-soft)",
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
              placeholder="DNI"
              value={user.document?.trim() || form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
              disabled={Boolean(user.document?.trim())}
              inputMode="numeric"
              style={fieldStyle}
            />

            <div className="layout-form-two">
              <input
                placeholder="Calle"
                value={form.streetName}
                onChange={(e) => setForm({ ...form, streetName: e.target.value })}
                style={fieldStyle}
              />
              <input
                placeholder="Numero"
                value={form.streetNumber}
                onChange={(e) => setForm({ ...form, streetNumber: e.target.value })}
                inputMode="numeric"
                style={fieldStyle}
              />
            </div>

            <input
              placeholder="Piso / depto / unidad (opcional)"
              value={form.address2}
              onChange={(e) => setForm({ ...form, address2: e.target.value })}
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
                placeholder="Provincia"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                style={fieldStyle}
              />
            </div>

            <div className="layout-form-two">
              <input
                placeholder="Codigo postal"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                style={fieldStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={saveAddress}
                disabled={saving || !canSaveAddress}
                style={{
                  flex: 1,
                  minWidth: 180,
                  border: "none",
                  borderRadius: 999,
                  background: "var(--accent-strong)",
                  color: "var(--accent-contrast)",
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
                  border: "1px solid var(--border-soft)",
                  background: "transparent",
                  color: "var(--account-text-strong)",
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
              border: "1px dashed var(--border-soft)",
              background: "var(--page-panel-strong-bg)",
              padding: 24,
              marginTop: 12,
              color: "var(--account-text-muted)",
              lineHeight: 1.7,
              alignSelf: "start",
              display: "grid",
              gap: 10,
            }}
          >
            <strong style={{ color: "var(--account-text-strong)", fontSize: 18 }}>
              Tus direcciones guardadas
            </strong>
            <span>
              Elegi una direccion para editarla o usa el boton{" "}
              <strong style={{ color: "var(--account-text-strong)" }}>Agregar nueva</strong> para cargar
              otra.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
