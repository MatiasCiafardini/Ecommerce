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
  borderRadius: 14,
  border: "1px solid var(--checkout-border)",
  background: "var(--checkout-field-bg)",
  color: "var(--checkout-field-color)",
} as const;

const hintStyle: React.CSSProperties = {
  margin: 0,
  borderRadius: 16,
  border: "1px solid var(--checkout-border)",
  background: "color-mix(in srgb, var(--checkout-card-bg) 72%, transparent)",
  color: "var(--checkout-text-muted)",
  lineHeight: 1.55,
  padding: "12px 14px",
};

const normalizePhoneDigits = (value: string) => value.replace(/\D/g, "");

const isValidCheckoutPhone = (value: string) => normalizePhoneDigits(value).length >= 8;
const normalizeDocumentDigits = (value: string) => value.replace(/\D/g, "");
const isValidDocument = (value: string) => normalizeDocumentDigits(value).length >= 7;
const buildStreetAddress = (streetName: string, streetNumber: string) =>
  [streetName.trim(), streetNumber.trim()].filter(Boolean).join(" ");

export default function CheckoutAddress({
  initialContact,
  onNext,
}: {
  initialContact?: {
    firstName: string;
    lastName: string;
    phone: string;
    customerNotes?: string;
  } | null;
  onNext: (address: Address) => void;
}) {
  const { user, setUser } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: initialContact?.firstName ?? user?.firstName ?? "",
    lastName: initialContact?.lastName ?? user?.lastName ?? "",
    phone: initialContact?.phone ?? user?.phone ?? "",
    document: user?.document ?? "",
    streetName: "",
    streetNumber: "",
    address2: "",
    city: "Buenos Aires",
    state: "Buenos Aires",
    zip: "",
    country: "Argentina",
  });
  const accountPhone = user?.phone?.trim() ?? "";
  const accountDocument = user?.document?.trim() ?? "";
  const checkoutPhone = accountPhone || form.phone.trim();
  const checkoutDocument = accountDocument || form.document.trim();
  const phoneIsValid = isValidCheckoutPhone(checkoutPhone);
  const documentIsValid = isValidDocument(checkoutDocument);
  const canSaveAddress =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.streetName.trim() &&
    form.streetNumber.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.zip.trim() &&
    phoneIsValid &&
    documentIsValid;

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

  useEffect(() => {
    setForm((current) => ({
      ...current,
      firstName: current.firstName || initialContact?.firstName || user?.firstName || "",
      lastName: current.lastName || initialContact?.lastName || user?.lastName || "",
      phone: user?.phone ?? initialContact?.phone ?? current.phone,
      document: user?.document ?? current.document,
    }));
  }, [initialContact?.firstName, initialContact?.lastName, initialContact?.phone, user?.document, user?.firstName, user?.lastName, user?.phone]);

  const ensureAccountContact = async () => {
    const phone = checkoutPhone.trim();
    const document = checkoutDocument.trim();

    if (!isValidCheckoutPhone(phone)) {
      throw new Error("Carga un telefono valido para continuar con la compra.");
    }

    if (!isValidDocument(document)) {
      throw new Error("Carga un DNI valido para continuar con la compra.");
    }

    if (accountPhone && accountDocument) {
      return { phone: accountPhone, document: accountDocument };
    }

    const updatedUser = await api("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({
        ...(accountPhone ? {} : { phone }),
        ...(accountDocument ? {} : { document }),
      }),
    });
    setUser(updatedUser);
    return {
      phone: updatedUser?.phone?.trim() || phone,
      document: updatedUser?.document?.trim() || document,
    };
  };

  const saveAddress = async () => {
    try {
      setSaving(true);
      setError("");
      const { phone } = await ensureAccountContact();
      const address = await api("/customer-addresses/me", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone,
          address1: buildStreetAddress(form.streetName, form.streetNumber),
          address2: form.address2.trim() || undefined,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: "Argentina",
        }),
      });

      setAddresses((prev) => [address, ...prev]);
      setSelected(address);
      setForm((prev) => ({ ...prev, phone, streetName: "", streetNumber: "", address2: "", zip: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la direccion.");
    } finally {
      setSaving(false);
    }
  };

  const continueWithSelectedAddress = async () => {
    if (!selected) return;

    try {
      setContinuing(true);
      setError("");
      const { phone } = await ensureAccountContact();
      onNext({ ...selected, phone: selected.phone?.trim() || phone });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo continuar con la compra.");
    } finally {
      setContinuing(false);
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
          borderRadius: 28,
          border: "1px solid var(--checkout-border)",
          background: "var(--checkout-panel-bg)",
          padding: 22,
          display: "grid",
          gap: 14,
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
              fontSize: "clamp(1.75rem, 2.8vw, 2.6rem)",
              lineHeight: 1.05,
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
                borderRadius: 18,
                border: "1px dashed var(--checkout-border-strong)",
                background: "var(--checkout-card-alt-bg)",
                padding: 16,
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
                    borderRadius: 20,
                    border: active
                      ? "1px solid var(--checkout-border-strong)"
                      : "1px solid var(--checkout-border)",
                    background: active
                      ? "color-mix(in srgb, var(--checkout-primary-bg) 18%, var(--checkout-card-bg))"
                      : "var(--checkout-card-bg)",
                    padding: 18,
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
                    Direccion guardada
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
                    {addr.address2 ? (
                      <>
                        <br />
                        {addr.address2}
                      </>
                    ) : null}
                    <br />
                    {[addr.city, addr.state].filter(Boolean).join(", ")}
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
          borderRadius: 28,
          border: "1px solid var(--checkout-border)",
          background: "var(--checkout-panel-bg)",
          padding: 22,
          display: "grid",
          gap: 14,
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
          <h3 style={{ margin: "8px 0 0", fontSize: 24, color: "var(--checkout-text-strong)" }}>
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
          placeholder="Ej: 11 1234-5678"
          value={accountPhone || form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          disabled={Boolean(accountPhone)}
          style={fieldStyle}
        />

        {accountPhone ? (
          <p style={hintStyle}>
            Usaremos el telefono guardado en tu cuenta.
          </p>
        ) : (
          <p style={hintStyle}>
            Usamos este telefono para coordinar la entrega. Al continuar, queda guardado en tu cuenta.
            {checkoutPhone && !phoneIsValid ? " Revisa el numero: faltan digitos." : ""}
          </p>
        )}

        <input
          placeholder="DNI"
          value={accountDocument || form.document}
          onChange={(e) => setForm({ ...form, document: e.target.value })}
          disabled={Boolean(accountDocument)}
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

        <button
          onClick={saveAddress}
          disabled={saving || !canSaveAddress}
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

        {error ? (
          <p style={{ margin: 0, color: "var(--checkout-error-color, #b42318)", lineHeight: 1.6 }}>
            {error}
          </p>
        ) : null}

        <button
          className="checkout-primary-action"
          disabled={!selected || !selected.state?.trim() || !phoneIsValid || !documentIsValid || continuing}
          onClick={() => void continueWithSelectedAddress()}
          style={{
            border: "none",
            borderRadius: 999,
            background:
              selected && selected.state?.trim()
                ? "var(--checkout-primary-bg)"
                : "var(--checkout-card-alt-bg)",
            color:
              selected && selected.state?.trim()
                ? "var(--checkout-primary-color)"
                : "var(--checkout-text-muted)",
            padding: "15px 18px",
            fontWeight: 700,
            cursor:
            selected && selected.state?.trim() && phoneIsValid && !continuing ? "pointer" : "not-allowed",
          }}
        >
          {continuing
            ? "Guardando datos..."
            : !phoneIsValid
              ? "Carga un telefono valido"
            : selected && !selected.state?.trim()
            ? "Completa la provincia para continuar"
            : "Continuar con esta direccion"}
        </button>
      </aside>
    </section>
  );
}
