"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import AdminShipmentOperationsPanel from "./AdminShipmentOperationsPanel";
import AdminShippingMethodsCard from "./AdminShippingMethodsCard";
import {
  isPickupOrder,
  money,
  orderCustomerName,
  orderShippingAddressLines,
  type CustomerOrder,
} from "./order-utils";
import type { AdminShipment, AdminStoreShippingMethod } from "./admin-types";

type ShipmentFormState = {
  orderId: string;
  provider: string;
  method: string;
  weight: string;
  shippingAddress: string;
  postalCode: string;
};

const emptyForm: ShipmentFormState = {
  orderId: "",
  provider: "",
  method: "",
  weight: "",
  shippingAddress: "",
  postalCode: "",
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const formatShipmentStatus = (status: string) =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AdminShipmentsSection() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [shippingMethods, setShippingMethods] = useState<AdminStoreShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingShipment, setSavingShipment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<ShipmentFormState>(emptyForm);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, shipmentsData, methodsData] = await Promise.all([
        api("/orders"),
        api("/admin/shipments"),
        api("/admin/shipping/methods"),
      ]);

      setOrders(Array.isArray(ordersData) ? (ordersData as CustomerOrder[]) : []);
      setShipments(Array.isArray(shipmentsData) ? (shipmentsData as AdminShipment[]) : []);
      setShippingMethods(
        Array.isArray(methodsData) ? (methodsData as AdminStoreShippingMethod[]) : [],
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudieron cargar los envios."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const orderLookup = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );

  const availableOrders = useMemo(() => {
    const shippedOrderIds = new Set(shipments.map((shipment) => shipment.orderId));

    return orders.filter((order) => {
      if (isPickupOrder(order)) {
        return false;
      }

      if (shippedOrderIds.has(order.id)) {
        return false;
      }

      return ["paid", "processing", "packed", "shipped"].includes(order.status);
    });
  }, [orders, shipments]);

  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedShipmentId) ?? shipments[0] ?? null;

  useEffect(() => {
    if (!selectedShipmentId && shipments[0]) {
      setSelectedShipmentId(shipments[0].id);
    }
  }, [selectedShipmentId, shipments]);

  const applyOrderToForm = (orderId: string) => {
    const numericOrderId = Number(orderId);
    const order = orders.find((item) => item.id === numericOrderId);
    const shippingAddress = order ? orderShippingAddressLines(order).join(", ") : "";

    setForm((current) => ({
      ...current,
      orderId,
      provider: current.provider || order?.shippingProvider || "manual",
      method: current.method || order?.shippingMethod || "",
      shippingAddress:
        current.shippingAddress || shippingAddress || "Completar direccion operativa",
      postalCode: current.postalCode || order?.shippingPostalCodeSnapshot || "",
    }));
  };

  const createShipment = async () => {
    const orderId = Number(form.orderId);

    if (
      !orderId ||
      !form.provider.trim() ||
      !form.method.trim() ||
      !form.shippingAddress.trim() ||
      !form.postalCode.trim()
    ) {
      setError("Completa pedido, proveedor, metodo, direccion y codigo postal.");
      return;
    }

    try {
      setSavingShipment(true);
      setError("");
      setSuccess("");

      await api("/admin/shipments", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          provider: form.provider.trim(),
          method: form.method.trim(),
          weight: form.weight.trim() ? Number(form.weight) : undefined,
          shippingAddress: form.shippingAddress.trim(),
          postalCode: form.postalCode.trim(),
        }),
      });

      setForm(emptyForm);
      await loadData();
      setSuccess("Envio creado y listo para gestionar tracking.");
    } catch (createError) {
      setError(getErrorMessage(createError, "No se pudo crear el envio."));
    } finally {
      setSavingShipment(false);
    }
  };

  return (
    <section style={panelStyle}>
      <Header
        title="Envios"
        copy="Configura los metodos que la tienda cobra en checkout y despues gestiona carrier, tracking y etiqueta desde el mismo espacio."
      />

      {error ? <p style={errorStyle}>{error}</p> : null}
      {success ? <p style={successStyle}>{success}</p> : null}

      {loading ? (
        <StateCard label="Cargando gestion de envios..." />
      ) : (
        <div style={layoutStyle}>
          <div style={{ display: "grid", gap: 20, alignSelf: "start" }}>
            <AdminShippingMethodsCard
              shippingMethods={shippingMethods}
              onUpdated={loadData}
              onError={(message) => {
                setError(message);
                setSuccess("");
              }}
              onSuccess={(message) => {
                setSuccess(message);
                setError("");
              }}
            />

            <section style={blockStyle}>
              <div>
                <p style={eyebrowStyle}>Excepciones</p>
                <h3 style={title3Style}>Crear envio manual</h3>
              </div>

              <div style={formGridStyle}>
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={labelStyle}>Pedido</label>
                  <select
                    className="theme-select"
                    value={form.orderId}
                    onChange={(event) => applyOrderToForm(event.target.value)}
                    style={fieldStyle}
                  >
                    <option value="">Seleccionar pedido</option>
                    {availableOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Pedido #{order.id} · {orderCustomerName(order)} · {money(order.total)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={labelStyle}>Proveedor</label>
                  <input
                    value={form.provider}
                    onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
                    placeholder="Ej. manual"
                    style={fieldStyle}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={labelStyle}>Metodo</label>
                  <input
                    value={form.method}
                    onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}
                    placeholder="Ej. Envio express"
                    style={fieldStyle}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={labelStyle}>Peso</label>
                  <input
                    value={form.weight}
                    onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))}
                    placeholder="0.80"
                    style={fieldStyle}
                    inputMode="decimal"
                  />
                </div>

                <div style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Direccion operativa</label>
                  <textarea
                    value={form.shippingAddress}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, shippingAddress: event.target.value }))
                    }
                    rows={3}
                    style={textareaStyle}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={labelStyle}>Codigo postal</label>
                  <input
                    value={form.postalCode}
                    onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
                    placeholder="1425"
                    style={fieldStyle}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void createShipment()}
                disabled={savingShipment}
                style={primaryButtonStyle}
              >
                {savingShipment ? "Creando..." : "Crear envio"}
              </button>

              <div style={hintCardStyle}>
                {availableOrders.length > 0
                  ? `${availableOrders.length} pedido${availableOrders.length === 1 ? "" : "s"} sin shipment para resolver manualmente.`
                  : "No hay excepciones pendientes. Los pedidos normales se siguen gestionando desde el shipment creado al empacar."}
              </div>
            </section>
          </div>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Despacho</p>
                <h3 style={title3Style}>Envios activos</h3>
              </div>
              <span style={metaStyle}>{shipments.length} registrados</span>
            </div>

            {shipments.length === 0 ? (
              <StateCard label="Todavia no hay envios creados." />
            ) : (
              <div style={trackingStackStyle}>
                <div style={shipmentListGridStyle}>
                  {shipments.map((shipment) => {
                    const order = orderLookup.get(shipment.orderId);
                    const active = shipment.id === selectedShipment?.id;

                    return (
                      <button
                        key={shipment.id}
                        type="button"
                        onClick={() => setSelectedShipmentId(shipment.id)}
                        style={shipmentListItemStyle(active)}
                      >
                        <div style={betweenStyle}>
                          <strong style={{ color: "#fff" }}>Pedido #{shipment.orderId}</strong>
                          <span style={statusChipStyle(shipment.status)}>
                            {formatShipmentStatus(shipment.status)}
                          </span>
                        </div>
                        <p style={copyStyle}>
                          {order ? orderCustomerName(order) : "Pedido sin resumen cargado"}
                        </p>
                        <p style={metaStyle}>
                          {shipment.carrier || shipment.provider} · {shipment.method}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {selectedShipment ? (
                  <AdminShipmentOperationsPanel
                    shipment={selectedShipment}
                    order={orderLookup.get(selectedShipment.orderId)}
                    onUpdated={loadData}
                    onError={(message) => {
                      setError(message);
                      setSuccess("");
                    }}
                    onSuccess={(message) => {
                      setSuccess(message);
                      setError("");
                    }}
                  />
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function Header({ title, copy }: { title: string; copy?: string }) {
  return (
    <div style={betweenStyle}>
      <div>
        <p style={eyebrowStyle}>Gestion</p>
        <h2 style={title2Style}>{title}</h2>
      </div>
      {copy ? <p style={copyStyle}>{copy}</p> : null}
    </div>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 24 };
const layoutStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(320px, 400px) minmax(0, 1fr)", gap: 20, alignItems: "start" };
const blockStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid var(--checkout-border)", background: "var(--page-panel-bg)", padding: 22, display: "grid", gap: 16 };
const formGridStyle: React.CSSProperties = { display: "grid", gap: 12 };
const trackingStackStyle: React.CSSProperties = { display: "grid", gap: 16 };
const shipmentListGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "var(--muted-field-bg)", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border)", borderRadius: 16, outline: "none" };
const textareaStyle: React.CSSProperties = { ...fieldStyle, resize: "vertical", minHeight: 96 };
const primaryButtonStyle: React.CSSProperties = { padding: "14px 18px", background: "var(--accent-strong)", color: "var(--accent-contrast)", border: "none", borderRadius: 999, cursor: "pointer", fontWeight: 700 };
const stateStyle: React.CSSProperties = { borderRadius: 20, border: "1px solid var(--checkout-border-strong)", background: "var(--page-panel-strong-bg)", padding: 18, color: "var(--account-text-muted)" };
const hintCardStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 14, color: "var(--account-text-muted)", lineHeight: 1.6 };
const shipmentListItemStyle = (active: boolean): React.CSSProperties => ({
  borderRadius: 18,
  border: active ? "1px solid var(--checkout-border-strong)" : "1px solid var(--checkout-border)",
  background: active ? "var(--ghost-chip-active-bg)" : "var(--page-panel-strong-bg)",
  padding: 16,
  color: "var(--account-text-strong)",
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 8,
});
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
const betweenStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, color: "var(--account-text-soft)" };
const title2Style: React.CSSProperties = { margin: "10px 0 0", fontSize: "clamp(1.8rem,2vw,2.6rem)", letterSpacing: "-0.05em" };
const title3Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 22, color: "var(--account-text-strong)" };
const labelStyle: React.CSSProperties = { color: "var(--account-text-muted)", fontSize: 14 };
const metaStyle: React.CSSProperties = { color: "var(--account-text-soft)", fontSize: 13 };
const copyStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-muted)", lineHeight: 1.7 };
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
