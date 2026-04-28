"use client";

import { useEffect, useState } from "react";
import { api, apiBlob } from "@/lib/api";
import { openBlobFile } from "@/lib/download";
import { isPickupOrder, type CustomerOrder } from "./order-utils";

type Props = {
  order: CustomerOrder;
  onOrderUpdated: (order: CustomerOrder) => void;
  onError: (message: string) => void;
};

type ShipmentFormState = {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  internalNotes: string;
};

const emptyForm: ShipmentFormState = {
  carrier: "",
  trackingNumber: "",
  trackingUrl: "",
  internalNotes: "",
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const carrierSuggestions = [
  "Correo Argentino",
  "Andreani",
  "OCA",
  "Vía Cargo",
  "Moto mensajeria",
  "Transporte propio",
];

const requiresTracking = (order: CustomerOrder) => {
  if (isPickupOrder(order)) return false;
  const provider = order.shippingProvider?.trim().toLowerCase() ?? "";
  const shipmentProvider = order.shipment?.provider?.trim().toLowerCase() ?? "";
  const method = order.shippingMethod?.trim().toLowerCase() ?? "";
  if (
    provider === "correo-argentino" ||
    provider === "enviopack" ||
    shipmentProvider === "correo-argentino" ||
    shipmentProvider === "enviopack"
  ) {
    return false;
  }
  return !method.includes("coordinar");
};

export default function AdminOrderShipmentPanel({
  order,
  onOrderUpdated,
  onError,
}: Props) {
  const [form, setForm] = useState<ShipmentFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setForm({
      carrier: order.shipment?.carrier ?? "",
      trackingNumber: order.shipment?.trackingNumber ?? "",
      trackingUrl: order.shipment?.trackingUrl ?? "",
      internalNotes: order.shipment?.internalNotes ?? "",
    });
  }, [order]);

  if (!order.shipment || isPickupOrder(order)) {
    return null;
  }

  const trackingRequired = requiresTracking(order);
  const hasCarrier = Boolean(form.carrier.trim());
  const hasTracking = Boolean(form.trackingNumber.trim());
  const dispatchReady = !trackingRequired || (hasCarrier && hasTracking);
  const providerCode = order.shippingProvider?.trim().toLowerCase() ?? "";
  const automaticCarrier =
    providerCode === "correo-argentino" || providerCode === "enviopack";

  const saveShipment = async () => {
    try {
      setSaving(true);
      onError("");

      await api(`/admin/shipments/${order.shipment!.id}/manual`, {
        method: "PATCH",
        body: JSON.stringify({
          carrier: form.carrier.trim() || undefined,
          trackingNumber: form.trackingNumber.trim() || undefined,
          trackingUrl: form.trackingUrl.trim() || undefined,
          internalNotes: form.internalNotes.trim() || undefined,
          status: order.shipment?.status ?? "created",
        }),
      });

      const updated = await api(`/orders/${order.id}`);
      onOrderUpdated(updated as CustomerOrder);
    } catch (error) {
      onError(getErrorMessage(error, "No se pudieron guardar los datos del shipment."));
    } finally {
      setSaving(false);
    }
  };

  const dispatchOrder = async () => {
    if (requiresTracking(order)) {
      if (!form.carrier.trim()) {
        onError("Carga la empresa/correo antes de despachar.");
        return;
      }

      if (!form.trackingNumber.trim()) {
        onError("Carga el tracking antes de despachar.");
        return;
      }
    }

    try {
      setDispatching(true);
      onError("");

      await api(`/admin/shipments/${order.shipment!.id}/manual`, {
        method: "PATCH",
        body: JSON.stringify({
          carrier: form.carrier.trim() || undefined,
          trackingNumber: form.trackingNumber.trim() || undefined,
          trackingUrl: form.trackingUrl.trim() || undefined,
          internalNotes: form.internalNotes.trim() || undefined,
          status: "picked_up",
        }),
      });

      const updated = await api(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "shipped" }),
      });

      onOrderUpdated(updated as CustomerOrder);
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo despachar el pedido."));
    } finally {
      setDispatching(false);
    }
  };

  const refreshShipment = async () => {
    try {
      setRefreshing(true);
      onError("");
      await api(`/admin/shipments/${order.shipment!.id}/refresh`, {
        method: "POST",
      });
      const updated = await api(`/orders/${order.id}`);
      onOrderUpdated(updated as CustomerOrder);
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo sincronizar el shipment con el carrier."));
    } finally {
      setRefreshing(false);
    }
  };

  const downloadLabel = async () => {
    try {
      onError("");
      const blob = await apiBlob(`/admin/shipments/${order.shipment!.id}/label.pdf`);
      openBlobFile(blob);
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo descargar la etiqueta."));
    }
  };

  const downloadReceipt = async () => {
    try {
      onError("");
      const blob = await apiBlob(`/admin/shipments/${order.shipment!.id}/receipt.pdf`);
      openBlobFile(blob);
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo descargar el comprobante."));
    }
  };

  return (
    <section style={blockStyle}>
      <div>
        <p style={eyebrowStyle}>Despacho</p>
        <h3 style={title3Style}>Carrier y tracking</h3>
      </div>

      <div style={formGridStyle}>
        <div style={{ display: "grid", gap: 8 }}>
          <label style={labelStyle}>Empresa / correo</label>
          <input
            value={form.carrier}
            onChange={(event) => setForm((current) => ({ ...current, carrier: event.target.value }))}
            placeholder="Correo Argentino / Andreani / OCA"
            style={fieldStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", gridColumn: "1 / -1" }}>
          {carrierSuggestions.map((carrier) => (
            <button
              key={carrier}
              type="button"
              onClick={() => setForm((current) => ({ ...current, carrier }))}
              style={chipButtonStyle(form.carrier.trim().toLowerCase() === carrier.toLowerCase())}
            >
              {carrier}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={labelStyle}>Tracking</label>
          <input
            value={form.trackingNumber}
            onChange={(event) =>
              setForm((current) => ({ ...current, trackingNumber: event.target.value }))
            }
            placeholder="123456789AR"
            style={fieldStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Tracking URL</label>
          <input
            value={form.trackingUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, trackingUrl: event.target.value }))
            }
            placeholder="https://..."
            style={fieldStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Notas internas</label>
          <textarea
            value={form.internalNotes}
            onChange={(event) =>
              setForm((current) => ({ ...current, internalNotes: event.target.value }))
            }
            rows={3}
            style={textareaStyle}
          />
        </div>
      </div>

      <div style={readinessCardStyle(dispatchReady)}>
        <strong style={{ color: "var(--account-text-strong)" }}>
          {dispatchReady ? "Listo para despachar" : "Faltan datos para despachar"}
        </strong>
        <span style={metaTextStyle}>
          Carrier: {hasCarrier ? "ok" : "pendiente"} · Tracking:{" "}
          {trackingRequired ? (hasTracking ? "ok" : "pendiente") : "no requerido"}
        </span>
      </div>

      <div style={hintCardStyle}>
        {automaticCarrier
          ? "Este envio usa integracion carrier. El tracking y la etiqueta deben llegar desde la API de Correo/transportista; no hace falta cargarlos manualmente."
          : trackingRequired
            ? "Si este pedido sale por correo o transporte, el tracking se vuelve obligatorio antes de marcarlo como despachado."
            : "Este metodo no exige tracking obligatorio, pero podes dejar carrier, link y observaciones."}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void saveShipment()} disabled={saving} style={secondaryButtonStyle}>
          {saving ? "Guardando..." : "Guardar datos"}
        </button>
        {automaticCarrier ? (
          <button type="button" onClick={() => void refreshShipment()} disabled={refreshing} style={secondaryButtonStyle}>
            {refreshing ? "Sincronizando..." : "Refrescar carrier"}
          </button>
        ) : null}
        <button type="button" onClick={() => void downloadLabel()} style={secondaryButtonStyle}>
          Descargar etiqueta PDF
        </button>
        <button type="button" onClick={() => void downloadReceipt()} style={secondaryButtonStyle}>
          Descargar comprobante PDF
        </button>
        {order.status === "packed" ? (
          <button
            type="button"
            onClick={() => void dispatchOrder()}
            disabled={dispatching || !dispatchReady}
            style={primaryButtonStyle(dispatching || !dispatchReady)}
          >
            {dispatching ? "Despachando..." : "Guardar y marcar despachado"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

const blockStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid var(--checkout-border)", background: "var(--page-panel-bg)", padding: 22, display: "grid", gap: 16 };
const formGridStyle: React.CSSProperties = { display: "grid", gap: 12 };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "var(--muted-field-bg)", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border)", borderRadius: 16, outline: "none" };
const textareaStyle: React.CSSProperties = { ...fieldStyle, resize: "vertical", minHeight: 96 };
const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "14px 18px",
  background: disabled ? "color-mix(in srgb, var(--accent-strong) 34%, white)" : "var(--accent-strong)",
  color: disabled ? "color-mix(in srgb, var(--accent-contrast) 54%, transparent)" : "var(--accent-contrast)",
  border: "none",
  borderRadius: 999,
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
});
const secondaryButtonStyle: React.CSSProperties = { padding: "12px 16px", background: "transparent", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border-strong)", borderRadius: 999, cursor: "pointer", width: "fit-content" };
const hintCardStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 14, color: "var(--account-text-muted)", lineHeight: 1.6 };
const readinessCardStyle = (ready: boolean): React.CSSProperties => ({
  borderRadius: 18,
  border: `1px solid ${ready ? "rgba(184,245,194,0.22)" : "rgba(255,214,122,0.22)"}`,
  background: ready ? "rgba(184,245,194,0.08)" : "rgba(255,214,122,0.08)",
  padding: 14,
  display: "grid",
  gap: 6,
});
const chipButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 12px",
  borderRadius: 999,
  border: active ? "1px solid var(--checkout-border-strong)" : "1px solid var(--checkout-border)",
  background: active ? "var(--ghost-chip-active-bg)" : "var(--page-panel-strong-bg)",
  color: "var(--account-text-strong)",
  cursor: "pointer",
});
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, color: "var(--account-text-soft)" };
const title3Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 22, color: "var(--account-text-strong)" };
const labelStyle: React.CSSProperties = { color: "var(--account-text-muted)", fontSize: 14 };
const metaTextStyle: React.CSSProperties = { color: "var(--account-text-muted)", fontSize: 13 };
