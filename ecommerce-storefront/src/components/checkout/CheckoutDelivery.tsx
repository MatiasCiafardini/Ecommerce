"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { formatCurrency } from "@/lib/currency";

type StoreShippingMethod = {
  id: string;
  name: string;
  type: "pickup" | "manual" | "free" | "coordinar" | "integration";
  price: number;
  estimatedDays?: number | null;
  description?: string | null;
  pickupAddress?: string | null;
  pickupHours?: string | null;
  pickupInstructions?: string | null;
};

type PickupShippingOption = {
  provider: string;
  method: string;
  price: number;
  estimatedDays: number;
  carrierId?: string;
  carrierName?: string;
  serviceCode?: string;
  modalityCode?: string;
  dispatchType?: string;
  branchId?: string | null;
};

type CheckoutContact = {
  firstName: string;
  lastName: string;
  phone: string;
  customerNotes?: string;
};

const fieldStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--checkout-border)",
  background: "var(--checkout-field-bg)",
  color: "var(--checkout-field-color)",
} as const;

const fallbackPickupMethod: StoreShippingMethod = {
  id: "fallback-pickup",
  name: "Retiro en local",
  type: "pickup",
  price: 0,
  estimatedDays: 0,
  description: "Te avisaremos cuando el pedido este listo para retirar.",
};

const normalizePhoneDigits = (value: string) => value.replace(/\D/g, "");

const isValidCheckoutPhone = (value: string) => normalizePhoneDigits(value).length >= 8;

export default function CheckoutDelivery({
  onPickupNext,
  onShippingNext,
}: {
  onPickupNext: (payload: {
    contact: CheckoutContact;
    shippingOption: PickupShippingOption;
  }) => void;
  onShippingNext: (contact: CheckoutContact) => void;
}) {
  const { user, setUser } = useAuth();
  const [methods, setMethods] = useState<StoreShippingMethod[]>([]);
  const [selectedMode, setSelectedMode] = useState<"pickup" | "shipping">("pickup");
  const [selectedPickupId, setSelectedPickupId] = useState(fallbackPickupMethod.id);
  const [savingPhone, setSavingPhone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    customerNotes: "",
  });

  useEffect(() => {
    let active = true;

    void api("/store/shipping/methods")
      .then((data) => {
        if (!active) return;
        setMethods(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) {
          setMethods([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      firstName: current.firstName || user?.firstName || "",
      lastName: current.lastName || user?.lastName || "",
      phone: user?.phone ?? current.phone,
    }));
  }, [user?.firstName, user?.lastName, user?.phone]);

  const pickupMethods = useMemo(() => {
    const configured = methods.filter((method) => method.type === "pickup");
    return configured.length > 0 ? configured : [fallbackPickupMethod];
  }, [methods]);
  const hasShippingMethods = methods.some((method) => method.type !== "pickup");
  const selectedPickup =
    pickupMethods.find((method) => method.id === selectedPickupId) ?? pickupMethods[0];
  const phone = (user?.phone?.trim() || form.phone.trim());
  const phoneIsValid = isValidCheckoutPhone(phone);
  const canContinue = form.firstName.trim() && form.lastName.trim() && phoneIsValid;

  const ensureAccountPhone = async () => {
    const nextPhone = phone.trim();

    if (!isValidCheckoutPhone(nextPhone)) {
      throw new Error("Carga un telefono valido para coordinar la entrega o el retiro.");
    }

    if (user?.phone?.trim()) {
      return user.phone.trim();
    }

    const updatedUser = await api("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ phone: nextPhone }),
    });
    setUser(updatedUser);
    return nextPhone;
  };

  const continueCheckout = async () => {
    try {
      setSavingPhone(true);
      setError("");
      const confirmedPhone = await ensureAccountPhone();
      const contact = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: confirmedPhone,
        customerNotes: form.customerNotes.trim(),
      };

      if (selectedMode === "pickup") {
        onPickupNext({
          contact,
          shippingOption: {
            provider: "store",
            method: selectedPickup.name,
            price: Number(selectedPickup.price ?? 0),
            estimatedDays: Number(selectedPickup.estimatedDays ?? 0),
            carrierId: "store",
            carrierName: selectedPickup.name,
            serviceCode: "pickup",
            modalityCode: "pickup",
            dispatchType: "pickup",
            branchId: null,
          },
        });
        return;
      }

      onShippingNext(contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo continuar.");
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <section
      className="layout-two-col"
      style={{
        gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.85fr)",
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
            Entrega
          </p>
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "clamp(1.75rem, 2.8vw, 2.6rem)",
              lineHeight: 1.05,
              color: "var(--checkout-text-strong)",
            }}
          >
            Elegi como recibir el pedido
          </h2>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <button
            type="button"
            onClick={() => setSelectedMode("pickup")}
            className="checkout-select-card"
            data-active={selectedMode === "pickup" ? "true" : "false"}
            style={deliveryCardStyle(selectedMode === "pickup")}
          >
            <span style={eyebrowStyle}>Retiro</span>
            <strong style={{ fontSize: 22 }}>Retiro en local</strong>
            <span style={descriptionStyle}>
              No hace falta cargar domicilio. Te vamos a pedir un telefono para avisarte cuando este listo.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMode("shipping")}
            className="checkout-select-card"
            data-active={selectedMode === "shipping" ? "true" : "false"}
            style={deliveryCardStyle(selectedMode === "shipping")}
          >
            <span style={eyebrowStyle}>Envio</span>
            <strong style={{ fontSize: 22 }}>Enviar a domicilio</strong>
            <span style={descriptionStyle}>
              Despues de este paso vas a elegir o cargar una direccion para calcular las opciones disponibles.
            </span>
          </button>
        </div>

        {selectedMode === "pickup" ? (
          <div style={{ display: "grid", gap: 12 }}>
            {pickupMethods.length > 1 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {pickupMethods.map((method) => {
                  const active = selectedPickup?.id === method.id;
                  const pickupDetails = [
                    method.pickupAddress ? `Direccion: ${method.pickupAddress}` : null,
                    method.pickupHours ? `Horarios: ${method.pickupHours}` : null,
                    method.pickupInstructions,
                  ].filter(Boolean);
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPickupId(method.id)}
                      className="checkout-select-card"
                      data-active={active ? "true" : "false"}
                      style={pickupMethodStyle(active)}
                    >
                      <strong>{method.name}</strong>
                      <span style={descriptionStyle}>
                        {method.description || "Te avisaremos cuando el pedido este listo para retirar."}
                      </span>
                      {pickupDetails.length > 0 ? (
                        <span style={descriptionStyle}>{pickupDetails.join(" - ")}</span>
                      ) : null}
                      <strong>{Number(method.price ?? 0) <= 0 ? "Gratis" : formatCurrency(method.price)}</strong>
                    </button>
                  );
                })}
              </div>
            ) : null}
          <div style={hintStyle}>
              {selectedPickup.description || "Te avisamos cuando el pedido este listo para retirar."}
              {" "}
              {Number(selectedPickup.price ?? 0) <= 0
                ? "No se cobra envio."
                : `Costo de retiro: ${formatCurrency(selectedPickup.price)}.`}
            </div>
          </div>
        ) : hasShippingMethods ? (
          <div style={hintStyle}>La tienda tiene envios configurados. La cotizacion final se calcula con tu direccion antes del pago.</div>
        ) : (
          <div style={hintStyle}>Si no aparece una tarifa automatica, se mostraran las opciones manuales disponibles al cargar la direccion.</div>
        )}
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
            Contacto
          </p>
          <h3 style={{ margin: "8px 0 0", fontSize: 24, color: "var(--checkout-text-strong)" }}>
            Datos obligatorios
          </h3>
        </div>

        <div className="layout-form-two">
          <input
            placeholder="Nombre"
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
            style={fieldStyle}
          />
          <input
            placeholder="Apellido"
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
            style={fieldStyle}
          />
        </div>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ color: "var(--checkout-text-strong)", fontWeight: 700 }}>
            Telefono
          </span>
          <input
            placeholder="Ej: 11 1234-5678"
            value={user?.phone?.trim() || form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            disabled={Boolean(user?.phone?.trim())}
            style={fieldStyle}
          />
        </label>

        <p style={hintStyle}>
          Usamos este numero para coordinar el retiro, entrega o cualquier aviso importante del pedido.
          {!user?.phone?.trim() ? " Al continuar queda guardado en tu cuenta." : ""}
          {phone && !phoneIsValid ? " Revisa el numero: faltan digitos." : ""}
        </p>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ color: "var(--checkout-text-strong)", fontWeight: 700 }}>
            Nota para el pedido
          </span>
          <textarea
            placeholder="Ej: retira otra persona, timbre roto, horario preferido"
            value={form.customerNotes}
            onChange={(event) => setForm({ ...form, customerNotes: event.target.value })}
            rows={3}
            style={{ ...fieldStyle, resize: "vertical", minHeight: 96 }}
          />
        </label>

        {error ? (
          <p style={{ margin: 0, color: "var(--checkout-error-color, #b42318)", lineHeight: 1.6 }}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="checkout-primary-action"
          disabled={!canContinue || savingPhone}
          onClick={() => void continueCheckout()}
          style={{
            border: "none",
            borderRadius: 999,
            background: canContinue ? "var(--checkout-primary-bg)" : "var(--checkout-card-alt-bg)",
            color: canContinue ? "var(--checkout-primary-color)" : "var(--checkout-text-muted)",
            padding: "15px 18px",
            fontWeight: 700,
            cursor: canContinue && !savingPhone ? "pointer" : "not-allowed",
          }}
        >
          {savingPhone
            ? "Guardando datos..."
            : !phoneIsValid
              ? "Carga un telefono valido"
              : selectedMode === "pickup"
                ? "Continuar con retiro"
                : "Continuar a direccion"}
        </button>
      </aside>
    </section>
  );
}

const deliveryCardStyle = (active: boolean): React.CSSProperties => ({
  width: "100%",
  textAlign: "left",
  borderRadius: 20,
  border: active
    ? "1px solid var(--checkout-border-strong)"
    : "1px solid var(--checkout-border)",
  background: active
    ? "color-mix(in srgb, var(--checkout-primary-bg) 18%, var(--checkout-card-bg))"
    : "var(--checkout-card-bg)",
  color: "var(--checkout-text-strong)",
  padding: 18,
  cursor: "pointer",
  display: "grid",
  gap: 8,
});

const pickupMethodStyle = (active: boolean): React.CSSProperties => ({
  width: "100%",
  textAlign: "left",
  borderRadius: 18,
  border: active
    ? "1px solid var(--checkout-border-strong)"
    : "1px solid var(--checkout-border)",
  background: active
    ? "color-mix(in srgb, var(--checkout-primary-bg) 18%, var(--checkout-card-bg))"
    : "var(--checkout-card-bg)",
  color: "var(--checkout-text-strong)",
  padding: 16,
  cursor: "pointer",
  display: "grid",
  gap: 8,
});

const eyebrowStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 11,
  color: "var(--checkout-text-muted)",
};

const descriptionStyle: React.CSSProperties = {
  color: "var(--checkout-text-muted)",
  lineHeight: 1.7,
};

const hintStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--checkout-border)",
  background: "color-mix(in srgb, var(--checkout-card-bg) 72%, transparent)",
  color: "var(--checkout-text-muted)",
  lineHeight: 1.55,
  padding: "12px 14px",
};
