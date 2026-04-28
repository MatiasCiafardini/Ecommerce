"use client";

import { useEffect, useState } from "react";
import { api, apiBlob } from "@/lib/api";
import { openBlobFile } from "@/lib/download";
import { orderCustomerName, orderStatusLabel, type CustomerOrder } from "./order-utils";
import type { AdminShipment } from "./admin-types";

type Props = {
  shipment: AdminShipment;
  order?: CustomerOrder;
  onUpdated: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const shipmentStatuses = [
  "created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
] as const;

type ManualShipmentFormState = {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  status: string;
  internalNotes: string;
};

const emptyManualShipmentForm: ManualShipmentFormState = {
  carrier: "",
  trackingNumber: "",
  trackingUrl: "",
  status: "created",
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

const formatShipmentStatus = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const requiresTrackingForShipment = (shipment: AdminShipment) => {
  const method = shipment.method?.trim().toLowerCase() ?? "";
  return !method.includes("pickup") && !method.includes("retiro") && !method.includes("coordinar");
};

export default function AdminShipmentOperationsPanel({
  shipment,
  order,
  onUpdated,
  onError,
  onSuccess,
}: Props) {
  const [savingManualUpdate, setSavingManualUpdate] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [refreshingShipment, setRefreshingShipment] = useState(false);
  const [manualForm, setManualForm] = useState<ManualShipmentFormState>(emptyManualShipmentForm);
  const [trackingForm, setTrackingForm] = useState({
    status: "in_transit",
    description: "",
    location: "",
  });

  useEffect(() => {
    setManualForm({
      carrier: shipment.carrier ?? "",
      trackingNumber: shipment.trackingNumber ?? "",
      trackingUrl: shipment.trackingUrl ?? "",
      status: shipment.status ?? "created",
      internalNotes: shipment.internalNotes ?? "",
    });
  }, [shipment]);

  const trackingRequired = requiresTrackingForShipment(shipment);
  const hasCarrier = Boolean(manualForm.carrier.trim());
  const hasTracking = Boolean(manualForm.trackingNumber.trim());
  const canOpenRealLabel = Boolean(shipment.labelUrl || shipment.trackingNumber);
  const providerCode = shipment.provider?.trim().toLowerCase() ?? "";

  const saveManualShipment = async () => {
    if (trackingRequired && !manualForm.carrier.trim()) {
      onError("Carga la empresa/correo antes de guardar el envio.");
      return;
    }

    try {
      setSavingManualUpdate(true);
      await api(`/admin/shipments/${shipment.id}/manual`, {
        method: "PATCH",
        body: JSON.stringify({
          carrier: manualForm.carrier.trim() || undefined,
          trackingNumber: manualForm.trackingNumber.trim() || undefined,
          trackingUrl: manualForm.trackingUrl.trim() || undefined,
          status: manualForm.status,
          internalNotes: manualForm.internalNotes.trim() || undefined,
        }),
      });
      await onUpdated();
      onSuccess("Datos del envio actualizados.");
    } catch (error) {
      onError(getErrorMessage(error, "No se pudieron guardar los datos del envio."));
    } finally {
      setSavingManualUpdate(false);
    }
  };

  const addTrackingEvent = async () => {
    try {
      setSavingTracking(true);
      await api(`/admin/shipments/${shipment.id}/tracking`, {
        method: "POST",
        body: JSON.stringify({
          status: trackingForm.status,
          description: trackingForm.description.trim() || undefined,
          location: trackingForm.location.trim() || undefined,
        }),
      });
      setTrackingForm((current) => ({ ...current, description: "", location: "" }));
      await onUpdated();
      onSuccess("Evento de tracking agregado.");
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo agregar el evento."));
    } finally {
      setSavingTracking(false);
    }
  };

  const downloadLabel = async () => {
    try {
      const blob = await apiBlob(`/admin/shipments/${shipment.id}/label.pdf`);
      openBlobFile(blob);
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo abrir la etiqueta real del envio."));
    }
  };

  const downloadReceipt = async () => {
    try {
      const blob = await apiBlob(`/admin/shipments/${shipment.id}/receipt.pdf`);
      openBlobFile(blob);
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo descargar el comprobante."));
    }
  };

  const refreshShipment = async () => {
    try {
      setRefreshingShipment(true);
      await api(`/admin/shipments/${shipment.id}/refresh`, {
        method: "POST",
      });
      await onUpdated();
      onSuccess("Envio sincronizado con el carrier.");
    } catch (error) {
      onError(getErrorMessage(error, "No se pudo refrescar el envio desde el carrier."));
    } finally {
      setRefreshingShipment(false);
    }
  };

  return (
    <div style={stackStyle}>
      <div style={detailCardStyle}>
        <div style={betweenStyle}>
          <div>
            <p style={eyebrowStyle}>Detalle</p>
            <h4 style={title4Style}>Envio {shipment.id.slice(0, 8)}</h4>
          </div>
          <span style={statusChipStyle(shipment.status)}>{formatShipmentStatus(shipment.status)}</span>
        </div>

        <div style={infoGridStyle}>
          <InfoCell label="Pedido" value={`#${shipment.orderId}`} />
          <InfoCell label="Metodo" value={shipment.method} />
          <InfoCell label="Carrier" value={shipment.carrier ?? "Sin definir"} />
          <InfoCell label="Tracking" value={shipment.trackingNumber ?? "Sin asignar"} />
          <InfoCell label="Direccion" value={shipment.shippingAddress} />
          <InfoCell label="CP" value={shipment.postalCode} />
        </div>

        {order ? (
          <div style={hintCardStyle}>
            Cliente: {orderCustomerName(order)} · Estado del pedido: {orderStatusLabel(order.status)}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {shipment.trackingUrl ? (
            <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" style={secondaryLinkStyle}>
              Abrir tracking
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void refreshShipment()}
            style={secondaryButtonStyle}
            disabled={refreshingShipment}
          >
            {refreshingShipment ? "Sincronizando..." : "Refrescar tracking"}
          </button>
          <button
            type="button"
            onClick={() => void downloadLabel()}
            style={primaryButtonStyle}
            disabled={!canOpenRealLabel}
          >
            Ver etiqueta PDF
          </button>
          <button type="button" onClick={() => void downloadReceipt()} style={secondaryButtonStyle}>
            Ver comprobante PDF
          </button>
        </div>
        {!canOpenRealLabel ? (
          <div style={hintCardStyle}>
            {providerCode === "correo-argentino"
              ? "Correo Argentino todavia no devolvio un rotulo real para este envio. Primero debe existir tracking real o un labelUrl/documento provisto por el carrier."
              : "Todavia no hay una etiqueta real disponible para este envio."}
          </div>
        ) : null}
      </div>

      <div style={detailCardStyle}>
        <div>
          <p style={eyebrowStyle}>Gestion manual</p>
          <h4 style={title4Style}>Carrier y tracking</h4>
        </div>

        <div style={formGridStyle}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Empresa / correo</label>
            <input
              value={manualForm.carrier}
              onChange={(event) => setManualForm((current) => ({ ...current, carrier: event.target.value }))}
              placeholder="Correo Argentino / Andreani / OCA"
              style={fieldStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", gridColumn: "1 / -1" }}>
            {carrierSuggestions.map((carrier) => (
              <button
                key={carrier}
                type="button"
                onClick={() => setManualForm((current) => ({ ...current, carrier }))}
                style={chipButtonStyle(manualForm.carrier.trim().toLowerCase() === carrier.toLowerCase())}
              >
                {carrier}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Tracking</label>
            <input
              value={manualForm.trackingNumber}
              onChange={(event) =>
                setManualForm((current) => ({ ...current, trackingNumber: event.target.value }))
              }
              placeholder="123456789AR"
              style={fieldStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Tracking URL</label>
            <input
              value={manualForm.trackingUrl}
              onChange={(event) =>
                setManualForm((current) => ({ ...current, trackingUrl: event.target.value }))
              }
              placeholder="https://..."
              style={fieldStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Estado</label>
            <select
              className="theme-select"
              value={manualForm.status}
              onChange={(event) => setManualForm((current) => ({ ...current, status: event.target.value }))}
              style={fieldStyle}
            >
              {shipmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatShipmentStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Notas internas</label>
            <textarea
              value={manualForm.internalNotes}
              onChange={(event) =>
                setManualForm((current) => ({ ...current, internalNotes: event.target.value }))
              }
              rows={3}
              style={textareaStyle}
            />
          </div>
        </div>

        <div style={readinessCardStyle(!trackingRequired || (hasCarrier && hasTracking))}>
          <strong style={{ color: "var(--account-text-strong)" }}>
            {!trackingRequired || (hasCarrier && hasTracking)
              ? "Datos listos para despacho"
              : "Completa carrier y tracking"}
          </strong>
          <span style={metaTextStyle}>
            Carrier: {hasCarrier ? "ok" : "pendiente"} · Tracking:{" "}
            {trackingRequired ? (hasTracking ? "ok" : "pendiente") : "no requerido"}
          </span>
        </div>

        <div style={hintCardStyle}>
          {trackingRequired
            ? "Para envios por correo o transporte, carga empresa y tracking antes de despachar el pedido."
            : "Este metodo no exige tracking, pero podes dejar datos internos o un link opcional."}
        </div>

        <button
          type="button"
          onClick={() => void saveManualShipment()}
          disabled={savingManualUpdate}
          style={secondaryButtonStyle}
        >
          {savingManualUpdate ? "Guardando..." : "Guardar datos del envio"}
        </button>
      </div>

      <div style={detailCardStyle}>
        <div>
          <p style={eyebrowStyle}>Tracking</p>
          <h4 style={title4Style}>Agregar evento</h4>
        </div>

        <div style={formGridStyle}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Estado</label>
            <select
              className="theme-select"
              value={trackingForm.status}
              onChange={(event) => setTrackingForm((current) => ({ ...current, status: event.target.value }))}
              style={fieldStyle}
            >
              {shipmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatShipmentStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={labelStyle}>Ubicacion</label>
            <input
              value={trackingForm.location}
              onChange={(event) =>
                setTrackingForm((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Sucursal / Planta"
              style={fieldStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Descripcion</label>
            <textarea
              value={trackingForm.description}
              onChange={(event) =>
                setTrackingForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              style={textareaStyle}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void addTrackingEvent()}
          disabled={savingTracking}
          style={secondaryButtonStyle}
        >
          {savingTracking ? "Guardando..." : "Agregar evento"}
        </button>

        <div style={{ display: "grid", gap: 10 }}>
          {(shipment.trackingEvents ?? []).length > 0 ? (
            shipment.trackingEvents!.map((event) => (
              <article key={event.id} style={timelineCardStyle}>
                <div style={betweenStyle}>
                  <strong style={{ color: "var(--account-text-strong)" }}>{formatShipmentStatus(event.status)}</strong>
                  <span style={metaStyle}>{new Date(event.createdAt).toLocaleString("es-AR")}</span>
                </div>
                {event.description ? <p style={copyStyle}>{event.description}</p> : null}
                {event.location ? <span style={metaStyle}>{event.location}</span> : null}
              </article>
            ))
          ) : (
            <div style={stateStyle}>Todavia no hay eventos de tracking.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCellStyle}>
      <span style={smallLabelStyle}>{label}</span>
      <strong style={{ color: "var(--account-text-strong)", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}

const stackStyle: React.CSSProperties = { display: "grid", gap: 16 };
const detailCardStyle: React.CSSProperties = { borderRadius: 20, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 18, display: "grid", gap: 14 };
const timelineCardStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-bg)", padding: 14, display: "grid", gap: 8 };
const infoGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 };
const infoCellStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 14, display: "grid", gap: 6 };
const formGridStyle: React.CSSProperties = { display: "grid", gap: 12 };
const fieldStyle: React.CSSProperties = { width: "100%", maxWidth: "100%", padding: "14px 16px", background: "var(--muted-field-bg)", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border)", borderRadius: 16, outline: "none", boxSizing: "border-box" };
const textareaStyle: React.CSSProperties = { ...fieldStyle, resize: "vertical", minHeight: 96 };
const hintCardStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 14, color: "var(--account-text-muted)", lineHeight: 1.6 };
const stateStyle: React.CSSProperties = { borderRadius: 20, border: "1px solid var(--checkout-border-strong)", background: "var(--page-panel-strong-bg)", padding: 18, color: "var(--account-text-muted)" };
const primaryButtonStyle: React.CSSProperties = { padding: "14px 18px", background: "var(--accent-strong)", color: "var(--accent-contrast)", border: "none", borderRadius: 999, cursor: "pointer", fontWeight: 700, width: "fit-content" };
const secondaryButtonStyle: React.CSSProperties = { padding: "12px 16px", background: "transparent", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border-strong)", borderRadius: 999, cursor: "pointer", width: "fit-content" };
const secondaryLinkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 16px", background: "transparent", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border-strong)", borderRadius: 999, textDecoration: "none" };
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
const betweenStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, color: "var(--account-text-soft)" };
const title4Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 18, color: "var(--account-text-strong)" };
const smallLabelStyle: React.CSSProperties = { color: "var(--account-text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" };
const labelStyle: React.CSSProperties = { color: "var(--account-text-muted)", fontSize: 14 };
const metaStyle: React.CSSProperties = { color: "var(--account-text-soft)", fontSize: 13 };
const metaTextStyle: React.CSSProperties = { color: "var(--account-text-muted)", fontSize: 13 };
const copyStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-muted)", lineHeight: 1.7 };
const statusChipStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    status === "delivered"
      ? "rgba(184,245,194,0.12)"
      : status === "failed" || status === "returned"
        ? "rgba(255,159,159,0.12)"
        : "rgba(129,199,255,0.12)",
  color:
    status === "delivered"
      ? "#cbffd2"
      : status === "failed" || status === "returned"
        ? "#ffd6d6"
        : "#d2efff",
  fontSize: 12,
  fontWeight: 700,
});
