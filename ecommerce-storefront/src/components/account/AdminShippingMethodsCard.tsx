"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { money } from "./order-utils";
import type { AdminStoreShippingMethod } from "./admin-types";

type Props = {
  shippingMethods: AdminStoreShippingMethod[];
  onUpdated: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

type ShippingMethodFormState = {
  name: string;
  type: "pickup" | "manual" | "free" | "coordinar" | "integration";
  price: string;
  freeShippingMinimumAmount: string;
  estimatedDays: string;
  description: string;
  pickupAddress: string;
  pickupHours: string;
  pickupInstructions: string;
  active: boolean;
  displayOrder: string;
};

const shippingMethodTypes = [
  { value: "pickup", label: "Retiro en local" },
  { value: "manual", label: "Envio manual" },
  { value: "integration", label: "Envio por integracion" },
  { value: "free", label: "Envio gratis" },
  { value: "coordinar", label: "Envio a coordinar" },
] as const;

const emptyShippingMethodForm: ShippingMethodFormState = {
  name: "",
  type: "manual",
  price: "0",
  freeShippingMinimumAmount: "",
  estimatedDays: "",
  description: "",
  pickupAddress: "",
  pickupHours: "",
  pickupInstructions: "",
  active: true,
  displayOrder: "0",
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export default function AdminShippingMethodsCard({
  shippingMethods,
  onUpdated,
  onError,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<ShippingMethodFormState>(emptyShippingMethodForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingStateId, setUpdatingStateId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const zeroPriceType = ["pickup", "free", "coordinar", "integration"].includes(form.type);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyShippingMethodForm);
  };

  const editMethod = (method: AdminStoreShippingMethod) => {
    setEditingId(method.id);
    setForm({
      name: method.name,
      type: method.type,
      price: String(method.price ?? 0),
      freeShippingMinimumAmount:
        method.freeShippingMinimumAmount && method.freeShippingMinimumAmount > 0
          ? String(method.freeShippingMinimumAmount)
          : "",
      estimatedDays:
        method.estimatedDays !== null && method.estimatedDays !== undefined
          ? String(method.estimatedDays)
          : "",
      description: method.description ?? "",
      pickupAddress: method.pickupAddress ?? "",
      pickupHours: method.pickupHours ?? "",
      pickupInstructions: method.pickupInstructions ?? "",
      active: method.active,
      displayOrder: String(method.displayOrder ?? 0),
    });
  };

  const saveMethod = async () => {
    if (!form.name.trim()) {
      onError("El metodo necesita un nombre.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        type: form.type,
        price: Number(form.price || 0),
        freeShippingMinimumAmount:
          form.type === "free"
            ? Number(form.freeShippingMinimumAmount || 0) > 0
              ? Number(form.freeShippingMinimumAmount)
              : null
            : undefined,
        estimatedDays:
          form.estimatedDays.trim() === ""
            ? null
            : Math.max(Number(form.estimatedDays || 0), 0),
        description: form.description.trim() || undefined,
        pickupAddress: form.type === "pickup" ? form.pickupAddress.trim() || null : undefined,
        pickupHours: form.type === "pickup" ? form.pickupHours.trim() || null : undefined,
        pickupInstructions:
          form.type === "pickup" ? form.pickupInstructions.trim() || null : undefined,
        active: form.active,
        displayOrder: Number(form.displayOrder || 0),
      };

      if (editingId) {
        await api(`/admin/shipping/methods/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/admin/shipping/methods", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      await onUpdated();
      onSuccess("Metodo de envio guardado.");
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo guardar el metodo."));
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = async (method: AdminStoreShippingMethod) => {
    try {
      setUpdatingStateId(method.id);
      await api(`/admin/shipping/methods/${method.id}/active`, {
        method: "POST",
        body: JSON.stringify({ active: !method.active }),
      });
      await onUpdated();
      onSuccess("Estado del metodo actualizado.");
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo actualizar el metodo."));
    } finally {
      setUpdatingStateId(null);
    }
  };

  const archiveMethod = async (methodId: string) => {
    try {
      setArchivingId(methodId);
      await api(`/admin/shipping/methods/${methodId}`, { method: "DELETE" });
      if (editingId === methodId) {
        resetForm();
      }
      await onUpdated();
      onSuccess("Metodo eliminado.");
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo eliminar el metodo."));
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <section style={blockStyle}>
      <div>
        <p style={eyebrowStyle}>Checkout</p>
        <h3 style={title3Style}>Metodos de envio</h3>
      </div>

      <div style={formGridStyle}>
        <div style={{ display: "grid", gap: 8 }}>
          <label style={labelStyle}>Nombre</label>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ej. Envio estandar"
            style={fieldStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={labelStyle}>Tipo</label>
          <select
            className="theme-select"
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value as ShippingMethodFormState["type"],
                price: ["pickup", "free", "coordinar", "integration"].includes(event.target.value)
                  ? "0"
                  : current.price,
                freeShippingMinimumAmount:
                  event.target.value === "free" ? current.freeShippingMinimumAmount : "",
              }))
            }
            style={fieldStyle}
          >
            {shippingMethodTypes.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={labelStyle}>Precio</label>
          <input
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            placeholder="5000"
            style={fieldStyle}
            inputMode="numeric"
            disabled={zeroPriceType}
          />
        </div>

        {form.type === "free" ? (
          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Gratis desde</label>
            <input
              value={form.freeShippingMinimumAmount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  freeShippingMinimumAmount: event.target.value,
                }))
              }
              placeholder="70000"
              style={fieldStyle}
              inputMode="numeric"
            />
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 8 }}>
          <label style={labelStyle}>Orden visual</label>
          <input
            value={form.displayOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, displayOrder: event.target.value }))
            }
            placeholder="0"
            style={fieldStyle}
            inputMode="numeric"
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={labelStyle}>Tiempo estimado de entrega</label>
          <input
            value={form.estimatedDays}
            onChange={(event) =>
              setForm((current) => ({ ...current, estimatedDays: event.target.value }))
            }
            placeholder="Ej. 3"
            style={fieldStyle}
            inputMode="numeric"
          />
        </div>

        <div style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Descripcion</label>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            rows={3}
            style={textareaStyle}
          />
        </div>

        {form.type === "pickup" ? (
          <>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={labelStyle}>Direccion de retiro</label>
              <input
                value={form.pickupAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, pickupAddress: event.target.value }))
                }
                placeholder="Ej. Av. Siempre Viva 123"
                style={fieldStyle}
              />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={labelStyle}>Horarios de retiro</label>
              <input
                value={form.pickupHours}
                onChange={(event) =>
                  setForm((current) => ({ ...current, pickupHours: event.target.value }))
                }
                placeholder="Ej. Lun a Vie 10 a 18"
                style={fieldStyle}
              />
            </div>
            <div style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Instrucciones de retiro</label>
              <textarea
                value={form.pickupInstructions}
                onChange={(event) =>
                  setForm((current) => ({ ...current, pickupInstructions: event.target.value }))
                }
                rows={3}
                placeholder="Ej. Traer DNI o avisar si retira otra persona."
                style={textareaStyle}
              />
            </div>
          </>
        ) : null}
      </div>

      <div style={hintCardStyle}>
        {form.type === "free"
          ? "Si cargas un monto minimo, este metodo solo aparece en checkout cuando el subtotal del carrito lo alcanza."
          : form.type === "integration"
          ? "Este metodo muestra en checkout las cotizaciones del proveedor de envio activo, por ejemplo Correo Argentino."
          : zeroPriceType
          ? "Este tipo se publica con costo $0 y se usa para retiro, envio gratis o coordinacion manual."
          : "Usa precio fijo para cobrar el envio directamente en checkout."}
      </div>

      <label style={checkboxRowStyle}>
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) =>
            setForm((current) => ({ ...current, active: event.target.checked }))
          }
        />
        Activo en checkout
      </label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void saveMethod()} disabled={saving} style={primaryButtonStyle}>
          {saving ? "Guardando..." : editingId ? "Actualizar metodo" : "Crear metodo"}
        </button>
        {editingId ? (
          <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
            Cancelar
          </button>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {shippingMethods.length > 0 ? (
          shippingMethods.map((method) => (
            <article key={method.id} style={cardStyle}>
              <div style={betweenStyle}>
                <strong style={{ color: "var(--account-text-strong)" }}>{method.name}</strong>
                <span style={statusChipStyle(method.active)}>
                  {method.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p style={copyStyle}>
                {shippingMethodTypes.find((entry) => entry.value === method.type)?.label ?? method.type} ·{" "}
                {money(method.price)}
              </p>
              {method.type === "free" && method.freeShippingMinimumAmount ? (
                <p style={metaStyle}>Disponible desde {money(method.freeShippingMinimumAmount)}</p>
              ) : null}
              {method.estimatedDays !== null && method.estimatedDays !== undefined ? (
                <p style={metaStyle}>
                  Entrega estimada: {method.estimatedDays} dia{method.estimatedDays === 1 ? "" : "s"}
                </p>
              ) : null}
              {method.description ? <p style={metaStyle}>{method.description}</p> : null}
              {method.type === "pickup" && method.pickupAddress ? (
                <p style={metaStyle}>Direccion: {method.pickupAddress}</p>
              ) : null}
              {method.type === "pickup" && method.pickupHours ? (
                <p style={metaStyle}>Horarios: {method.pickupHours}</p>
              ) : null}
              {method.type === "pickup" && method.pickupInstructions ? (
                <p style={metaStyle}>{method.pickupInstructions}</p>
              ) : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => editMethod(method)} style={secondaryButtonStyle}>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void toggleMethod(method)}
                  disabled={updatingStateId === method.id}
                  style={secondaryButtonStyle}
                >
                  {method.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => void archiveMethod(method.id)}
                  disabled={archivingId === method.id}
                  style={dangerButtonStyle}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        ) : (
          <div style={stateStyle}>
            Todavia no configuraste metodos de envio para checkout.
          </div>
        )}
      </div>
    </section>
  );
}

const blockStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid var(--checkout-border)", background: "var(--page-panel-bg)", padding: 22, display: "grid", gap: 16 };
const formGridStyle: React.CSSProperties = { display: "grid", gap: 12 };
const cardStyle: React.CSSProperties = { borderRadius: 18, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 16, display: "grid", gap: 8 };
const fieldStyle: React.CSSProperties = { width: "100%", maxWidth: "100%", padding: "14px 16px", background: "var(--muted-field-bg)", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border)", borderRadius: 16, outline: "none", boxSizing: "border-box" };
const textareaStyle: React.CSSProperties = { ...fieldStyle, resize: "vertical", minHeight: 96 };
const primaryButtonStyle: React.CSSProperties = { padding: "14px 18px", background: "var(--accent-strong)", color: "var(--accent-contrast)", border: "none", borderRadius: 999, cursor: "pointer", fontWeight: 700 };
const secondaryButtonStyle: React.CSSProperties = { padding: "12px 16px", background: "transparent", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border-strong)", borderRadius: 999, cursor: "pointer", width: "fit-content" };
const dangerButtonStyle: React.CSSProperties = { padding: "12px 16px", background: "var(--admin-danger-bg)", color: "var(--admin-danger-color)", border: "1px solid var(--admin-danger-border)", borderRadius: 999, cursor: "pointer", width: "fit-content" };
const stateStyle: React.CSSProperties = { borderRadius: 20, border: "1px solid var(--checkout-border-strong)", background: "var(--page-panel-strong-bg)", padding: 18, color: "var(--account-text-muted)" };
const hintCardStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 14, color: "var(--account-text-muted)", lineHeight: 1.6 };
const checkboxRowStyle: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", color: "var(--account-text-muted)" };
const betweenStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, color: "var(--account-text-soft)" };
const title3Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 22, color: "var(--account-text-strong)" };
const labelStyle: React.CSSProperties = { color: "var(--account-text-muted)", fontSize: 14 };
const metaStyle: React.CSSProperties = { color: "var(--account-text-soft)", fontSize: 13 };
const copyStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-muted)", lineHeight: 1.7 };
const statusChipStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: active ? "rgba(184,245,194,0.12)" : "rgba(255,159,159,0.12)",
  color: active ? "#cbffd2" : "#ffd6d6",
  fontSize: 12,
  fontWeight: 700,
});
