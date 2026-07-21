"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { apiBlob } from "@/lib/api";
import { orderStatusLabel } from "../order-utils";

const statuses = [
  "pending",
  "paid",
  "processing",
  "packed",
  "ready_for_pickup",
  "picked_up",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export default function AdminAccountingSection() {
  const { isTabletOrSmaller, isPhone } = useViewportFlags();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [method, setMethod] = useState("all");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const downloadExport = async () => {
    try {
      setDownloading(true);
      setError("");
      setSuccess("");

      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status !== "all") params.set("status", status);
      if (provider !== "all") params.set("provider", provider);
      if (method !== "all") params.set("method", method);

      const blob = await apiBlob(`/orders/accounting/export?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contable-${from || "inicio"}-${to || "hoy"}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setSuccess("El CSV contable ya se descargo.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar el export contable.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section style={panelStyle}>
      <div>
        <p style={eyebrowStyle}>Contabilidad</p>
        <h2 style={title2Style}>Export contable</h2>
        <p style={copyStyle}>
          Export simple para contador con ventas, pagos, descuentos, envio y reintegros.
          Pensado para conciliacion y cierre mensual.
        </p>
      </div>

      <div
        style={{
          ...twoColumnStyle,
          gridTemplateColumns: isTabletOrSmaller
            ? "minmax(0, 1fr)"
            : twoColumnStyle.gridTemplateColumns,
        }}
      >
        <article
          style={{
            ...groupPanelStyle,
            padding: isPhone ? 18 : groupPanelStyle.padding,
            minWidth: 0,
          }}
        >
          <p style={eyebrowStyle}>Filtros</p>
          <h3 style={title3Style}>Periodo de exportacion</h3>
          <label style={shellStyle}>
            <span style={metaStyle}>Desde</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Estado</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={selectStyle}
            >
              <option value="all" style={optionStyle}>
                Todos
              </option>
              {statuses.map((item) => (
                <option key={item} value={item} style={optionStyle}>
                  {orderStatusLabel(item)}
                </option>
              ))}
              <option value="refunded" style={optionStyle}>
                Reintegrado
              </option>
            </select>
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Proveedor de pago</span>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              style={selectStyle}
            >
              <option value="all" style={optionStyle}>
                Todos
              </option>
              <option value="mercadopago" style={optionStyle}>
                Mercado Pago
              </option>
              <option value="bank_transfer" style={optionStyle}>
                Transferencia
              </option>
              <option value="manual" style={optionStyle}>
                Venta manual
              </option>
            </select>
          </label>
          <label style={shellStyle}>
            <span style={metaStyle}>Metodo</span>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              style={selectStyle}
            >
              <option value="all" style={optionStyle}>
                Todos
              </option>
              <option value="card" style={optionStyle}>
                Tarjeta
              </option>
              <option value="Débito" style={optionStyle}>
                Débito (venta manual)
              </option>
              <option value="bank_transfer" style={optionStyle}>
                Transferencia
              </option>
              <option value="cash" style={optionStyle}>
                Efectivo
              </option>
              <option value="Efectivo" style={optionStyle}>
                Efectivo (venta manual)
              </option>
              <option value="Transferencia" style={optionStyle}>
                Transferencia (venta manual)
              </option>
              <option value="manual" style={optionStyle}>
                Manual
              </option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void downloadExport()}
            disabled={downloading}
            style={primaryButtonStyle}
          >
            {downloading ? "Generando..." : "Descargar CSV contable"}
          </button>
          {error ? <p style={errorStyle}>{error}</p> : null}
          {success ? <p style={successStyle}>{success}</p> : null}
        </article>
        <article
          style={{
            ...groupPanelStyle,
            padding: isPhone ? 18 : groupPanelStyle.padding,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <p style={eyebrowStyle}>Columnas</p>
          <h3 style={title3Style}>Que incluye</h3>
          <div style={{ ...shellStyle, minWidth: 0 }}>
            {[
              "Fecha y numero de pedido",
              "Estado del pedido",
              "Cliente y email registrado en el pedido",
              "Subtotal, descuento, envio y total",
              "Proveedor, metodo, estado y monto del pago",
              "Referencia de pago de Mercado Pago",
              "Cuotas y detalle del estado del pago",
              "Cantidad y monto de reintegros",
              "Filtros por proveedor o metodo para separar conciliaciones",
              "Detalle completo de pagos divididos",
            ].map((item) => (
              <div
                key={item}
                style={{
                  ...checkStyle,
                  alignItems: "flex-start",
                  minWidth: 0,
                }}
              >
                <span style={softChipStyle}>CSV</span>
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function useViewportFlags() {
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const tabletQuery = window.matchMedia("(max-width: 1024px)");
    const phoneQuery = window.matchMedia("(max-width: 640px)");

    const sync = () => {
      setIsTabletOrSmaller(tabletQuery.matches);
      setIsPhone(phoneQuery.matches);
    };

    sync();
    tabletQuery.addEventListener("change", sync);
    phoneQuery.addEventListener("change", sync);

    return () => {
      tabletQuery.removeEventListener("change", sync);
      phoneQuery.removeEventListener("change", sync);
    };
  }, []);

  return {
    isTabletOrSmaller,
    isPhone,
  };
}

const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const title2Style: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(1.8rem,2vw,2.6rem)",
  letterSpacing: "-0.05em",
};

const title3Style: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 22,
  color: "var(--account-text-strong)",
};

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 18,
};

const shellStyle: React.CSSProperties = { display: "grid", gap: 18 };

const groupPanelStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--checkout-border)",
  background: "var(--page-panel-bg)",
  padding: 20,
  display: "grid",
  gap: 18,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  padding: "14px 16px",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--checkout-border)",
  borderRadius: 16,
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  width: "100%",
  maxWidth: 260,
  background: "var(--select-bg)",
  color: "var(--select-color)",
  appearance: "auto",
};

const optionStyle: React.CSSProperties = {
  background: "var(--select-bg)",
  color: "var(--select-color)",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  border: "none",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const checkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "var(--account-text-strong)",
};

const softChipStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};

const metaStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
};

const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
  maxWidth: 720,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};

const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
