"use client";

import { useEffect, useMemo, useState } from "react";
import { api, apiBlob } from "@/lib/api";
import {
  money,
  orderCustomerName,
  orderStatusLabel,
  type CustomerOrder,
} from "./order-utils";
import type { AdminCancellationRequest, AdminReturn } from "./admin-types";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const returnStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    requested: "Solicitada",
    approved: "Aprobada",
    received: "Recibida",
    resolved: "Resuelta",
    rejected: "Rechazada",
    refunded: "Reintegrada",
  };

  return labels[status] ?? status;
};

export default function AdminReturnsSection() {
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [cancellations, setCancellations] = useState<AdminCancellationRequest[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [refundAmounts, setRefundAmounts] = useState<Record<number, string>>({});
  const [instructionDrafts, setInstructionDrafts] = useState<Record<number, string>>({});
  const [adminNotesDrafts, setAdminNotesDrafts] = useState<Record<number, string>>({});
  const [refundOnReceive, setRefundOnReceive] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [returnsData, ordersData, cancellationsData] = await Promise.all([
        api("/returns"),
        api("/orders"),
        api("/orders/cancellation-requests/list"),
      ]);

      setReturns(Array.isArray(returnsData) ? (returnsData as AdminReturn[]) : []);
      setOrders(Array.isArray(ordersData) ? (ordersData as CustomerOrder[]) : []);
      setCancellations(
        Array.isArray(cancellationsData)
          ? (cancellationsData as AdminCancellationRequest[])
          : [],
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudieron cargar las devoluciones."));
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

  const requestedReturns = returns.filter((item) => item.status === "requested");
  const approvedReturns = returns.filter((item) => item.status === "approved");
  const receivedReturns = returns.filter((item) => item.status === "received");
  const processedReturns = returns.filter(
    (item) =>
      item.status !== "requested" &&
      item.status !== "approved" &&
      item.status !== "received",
  );
  const requestedCancellations = cancellations.filter((item) => item.status === "requested");
  const processedCancellations = cancellations.filter((item) => item.status !== "requested");

  const openReturnProof = async (proofUrl: string) => {
    try {
      setError("");
      const blob = await apiBlob(proofUrl);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (proofError) {
      setError(getErrorMessage(proofError, "No se pudo abrir el comprobante."));
    }
  };

  const processReturn = async (returnId: number, approve: boolean) => {
    try {
      setProcessingId(returnId);
      setError("");
      setSuccess("");

      await api(`/returns/${returnId}/review`, {
        method: "POST",
        body: JSON.stringify({
          approve,
          adminInstructions: approve ? instructionDrafts[returnId]?.trim() || undefined : undefined,
          adminNotes: adminNotesDrafts[returnId]?.trim() || undefined,
        }),
      });

      await loadData();
      setSuccess(
        approve
          ? "Devolución aprobada. El cliente ya puede ver las instrucciones para enviarla."
          : "Devolución rechazada.",
      );
    } catch (processError) {
      setError(getErrorMessage(processError, "No se pudo procesar la devolución."));
    } finally {
      setProcessingId(null);
    }
  };

  const receiveReturn = async (returnId: number) => {
    try {
      setProcessingId(returnId);
      setError("");
      setSuccess("");

      const refundAmount = refundAmounts[returnId]?.trim();

      await api(`/returns/${returnId}/receive`, {
        method: "POST",
        body: JSON.stringify({
          refundCustomer: refundOnReceive[returnId] !== false,
          refundAmount: refundAmount ? Number(refundAmount) : undefined,
          adminNotes: adminNotesDrafts[returnId]?.trim() || undefined,
        }),
      });

      await loadData();
      setSuccess(
        refundOnReceive[returnId] !== false
          ? "Producto recibido. Se actualizó stock y la devolución quedó resuelta."
          : "Producto recibido. La devolución quedó registrada como recibida.",
      );
    } catch (processError) {
      setError(getErrorMessage(processError, "No se pudo procesar la devolución recibida."));
    } finally {
      setProcessingId(null);
    }
  };

  const resolveReceivedReturn = async (returnId: number) => {
    try {
      setProcessingId(returnId);
      setError("");
      setSuccess("");

      const refundAmount = refundAmounts[returnId]?.trim();

      await api(`/returns/${returnId}/receive`, {
        method: "POST",
        body: JSON.stringify({
          refundCustomer: refundOnReceive[returnId] !== false,
          refundAmount: refundAmount ? Number(refundAmount) : undefined,
          adminNotes: adminNotesDrafts[returnId]?.trim() || undefined,
        }),
      });

      await loadData();
      setSuccess(
        refundOnReceive[returnId] !== false
          ? "La devolución recibida quedó resuelta con reintegro."
          : "La devolución recibida quedó marcada como resuelta.",
      );
    } catch (processError) {
      setError(getErrorMessage(processError, "No se pudo resolver la devolución recibida."));
    } finally {
      setProcessingId(null);
    }
  };

  const processCancellation = async (requestId: number, approve: boolean) => {
    try {
      setProcessingId(requestId);
      setError("");
      setSuccess("");

      const refundAmount = refundAmounts[requestId]?.trim();

      await api(`/orders/cancellation-requests/${requestId}/review`, {
        method: "POST",
        body: JSON.stringify({
          approve,
          refundAmount: approve && refundAmount ? Number(refundAmount) : undefined,
        }),
      });

      await loadData();
      setSuccess(approve ? "Ticket de cancelación procesado correctamente." : "Ticket rechazado.");
    } catch (processError) {
      setError(getErrorMessage(processError, "No se pudo procesar la cancelación."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section style={panelStyle}>
      <Header
        title="Devoluciones"
        copy="Gestiona solicitudes abiertas e historial de devoluciones."
      />

      {error ? <p style={errorStyle}>{error}</p> : null}
      {success ? <p style={successStyle}>{success}</p> : null}

      {loading ? (
        <StateCard label="Cargando devoluciones..." />
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Cancelaciones</p>
                <h3 style={title3Style}>Tickets para revisar</h3>
              </div>
              <span style={metaStyle}>{requestedCancellations.length} abiertas</span>
            </div>

            {requestedCancellations.length === 0 ? (
              <StateCard label="No hay tickets de cancelación pendientes." />
            ) : (
              <div style={requestGridStyle}>
                {requestedCancellations.map((entry) => (
                  <article key={entry.id} style={requestCardStyle}>
                    <div style={betweenStyle}>
                      <div>
                        <strong style={{ color: "#fff" }}>Ticket #{entry.id}</strong>
                        <p style={copyStyle}>Pedido #{entry.orderId}</p>
                      </div>
                      <span style={statusChipStyle(entry.status)}>
                        {returnStatusLabel(entry.status)}
                      </span>
                    </div>

                    <div style={infoGridStyle}>
                      <InfoCell
                        label="Cliente"
                        value={
                          [entry.customer?.firstName, entry.customer?.lastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim() || entry.customer?.email || "No disponible"
                        }
                      />
                      <InfoCell
                        label="Estado del pedido"
                        value={entry.order ? orderStatusLabel(entry.order.status) : "No disponible"}
                      />
                      <InfoCell
                        label="Total"
                        value={entry.order ? money(entry.order.total) : "A definir"}
                      />
                      <InfoCell
                        label="Entrega"
                        value={
                          entry.order
                            ? [entry.order.shippingProvider, entry.order.shippingMethod]
                                .filter(Boolean)
                                .join(" · ") || "A confirmar"
                            : "No disponible"
                        }
                      />
                    </div>

                    {entry.reason ? (
                      <div style={hintCardStyle}>
                        Motivo reportado: {entry.reason}
                      </div>
                    ) : null}

                    <div style={actionsRowStyle}>
                      <input
                        value={refundAmounts[entry.id] ?? ""}
                        onChange={(event) =>
                          setRefundAmounts((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        placeholder={entry.order ? `Reintegro sugerido ${money(entry.order.total)}` : "Monto opcional"}
                        inputMode="decimal"
                        style={fieldStyle}
                      />

                      <button
                        type="button"
                        onClick={() => void processCancellation(entry.id, false)}
                        disabled={processingId === entry.id}
                        style={secondaryButtonStyle}
                      >
                        {processingId === entry.id ? "Procesando..." : "Rechazar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void processCancellation(entry.id, true)}
                        disabled={processingId === entry.id}
                        style={primaryButtonStyle}
                      >
                        {processingId === entry.id ? "Procesando..." : "Aprobar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>En espera</p>
                <h3 style={title3Style}>Producto por recibir</h3>
              </div>
              <span style={metaStyle}>{approvedReturns.length} aprobadas</span>
            </div>

            {approvedReturns.length === 0 ? (
              <StateCard label="No hay devoluciones aprobadas esperando recepción." />
            ) : (
              <div style={requestGridStyle}>
                {approvedReturns.map((entry) => {
                  const order = orderLookup.get(entry.orderId);
                  const shouldRefund = refundOnReceive[entry.id] !== false;

                  return (
                    <article key={entry.id} style={requestCardStyle}>
                      <div style={betweenStyle}>
                        <div>
                          <strong style={{ color: "#fff" }}>Solicitud #{entry.id}</strong>
                          <p style={copyStyle}>Pedido #{entry.orderId}</p>
                        </div>
                        <span style={statusChipStyle(entry.status)}>
                          {returnStatusLabel(entry.status)}
                        </span>
                      </div>

                      {entry.adminInstructions ? (
                        <div style={hintCardStyle}>
                          Instrucciones enviadas: {entry.adminInstructions}
                        </div>
                      ) : null}

                      {entry.shippedAt || entry.customerShipmentCarrier || entry.customerShipmentTracking ? (
                        <div style={hintCardStyle}>
                          {entry.shippedAt
                            ? `Cliente informó despacho el ${new Date(entry.shippedAt).toLocaleString("es-AR")}. `
                            : ""}
                          {entry.customerShipmentCarrier
                            ? `Método: ${entry.customerShipmentCarrier}. `
                            : ""}
                          {entry.customerShipmentTracking
                            ? `Tracking: ${entry.customerShipmentTracking}.`
                            : ""}
                        </div>
                      ) : null}
                      {entry.customerShipmentProofUrl ? (
                        <button
                          type="button"
                          onClick={() => void openReturnProof(entry.customerShipmentProofUrl!)}
                          style={{
                            width: "fit-content",
                            color: "var(--account-text-strong)",
                            textDecoration: "underline",
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          Ver comprobante de envío
                        </button>
                      ) : null}

                      <div style={itemListStyle}>
                        {entry.items.map((item) => (
                          <div key={item.id} style={inlineItemStyle}>
                            {`Item #${item.orderItemId} · Cantidad ${item.quantity}`}
                          </div>
                        ))}
                      </div>

                      <label style={checkboxRowStyle}>
                        <input
                          type="checkbox"
                          checked={shouldRefund}
                          onChange={(event) =>
                            setRefundOnReceive((current) => ({
                              ...current,
                              [entry.id]: event.target.checked,
                            }))
                          }
                        />
                        <span>Reintegrar dinero al cerrar la devolución</span>
                      </label>

                      <input
                        value={refundAmounts[entry.id] ?? ""}
                        onChange={(event) =>
                          setRefundAmounts((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        placeholder={order ? `Monto sugerido ${money(order.total)}` : "Monto opcional"}
                        inputMode="decimal"
                        disabled={!shouldRefund}
                        style={{ ...fieldStyle, opacity: shouldRefund ? 1 : 0.58 }}
                      />

                      <textarea
                        value={adminNotesDrafts[entry.id] ?? entry.adminNotes ?? ""}
                        onChange={(event) =>
                          setAdminNotesDrafts((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        placeholder="Notas internas al recibir el producto"
                        style={{ ...fieldStyle, minHeight: 84, resize: "vertical" }}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => void receiveReturn(entry.id)}
                          disabled={processingId === entry.id}
                          style={primaryButtonStyle}
                        >
                          {processingId === entry.id
                            ? "Procesando..."
                            : shouldRefund
                              ? "Marcar recibido y resolver"
                              : "Marcar recibido"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Pendientes</p>
                <h3 style={title3Style}>Solicitudes para aprobar</h3>
              </div>
              <span style={metaStyle}>{requestedReturns.length} abiertas</span>
            </div>

            {requestedReturns.length === 0 ? (
              <StateCard label="No hay devoluciones pendientes." />
            ) : (
              <div style={requestGridStyle}>
                {requestedReturns.map((entry) => {
                  const order = orderLookup.get(entry.orderId);

                  return (
                    <article key={entry.id} style={requestCardStyle}>
                      <div style={betweenStyle}>
                        <div>
                          <strong style={{ color: "#fff" }}>Solicitud #{entry.id}</strong>
                          <p style={copyStyle}>Pedido #{entry.orderId}</p>
                        </div>
                        <span style={statusChipStyle(entry.status)}>
                          {returnStatusLabel(entry.status)}
                        </span>
                      </div>

                      <div style={infoGridStyle}>
                        <InfoCell
                          label="Cliente"
                          value={order ? orderCustomerName(order) : "No disponible"}
                        />
                        <InfoCell
                          label="Estado del pedido"
                          value={order ? orderStatusLabel(order.status) : "No disponible"}
                        />
                        <InfoCell
                          label="Items"
                          value={`${entry.items.reduce((total, item) => total + item.quantity, 0)} unidades`}
                        />
                        <InfoCell
                          label="Monto sugerido"
                          value={order ? money(order.total) : "A definir"}
                        />
                      </div>

                      {entry.reason ? (
                        <div style={hintCardStyle}>
                          Motivo reportado: {entry.reason}
                        </div>
                      ) : null}

                      <textarea
                        value={instructionDrafts[entry.id] ?? entry.adminInstructions ?? ""}
                        onChange={(event) =>
                          setInstructionDrafts((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        placeholder="Instrucciones para que el cliente envíe el producto"
                        style={{ ...fieldStyle, minHeight: 96, resize: "vertical" }}
                      />

                      <textarea
                        value={adminNotesDrafts[entry.id] ?? entry.adminNotes ?? ""}
                        onChange={(event) =>
                          setAdminNotesDrafts((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        placeholder="Notas internas opcionales"
                        style={{ ...fieldStyle, minHeight: 84, resize: "vertical" }}
                      />

                      <div style={itemListStyle}>
                        {entry.items.map((item) => (
                          <div key={item.id} style={inlineItemStyle}>
                            {`Item #${item.orderItemId} · Cantidad ${item.quantity}`}
                          </div>
                        ))}
                      </div>

                      <div style={reviewActionsRowStyle}>
                        <button
                          type="button"
                          onClick={() => void processReturn(entry.id, false)}
                          disabled={processingId === entry.id}
                          style={secondaryButtonStyle}
                        >
                          {processingId === entry.id ? "Procesando..." : "Rechazar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void processReturn(entry.id, true)}
                          disabled={processingId === entry.id}
                          style={primaryButtonStyle}
                        >
                          {processingId === entry.id ? "Procesando..." : "Aprobar e informar"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Recibidas</p>
                <h3 style={title3Style}>Pendientes de resolución</h3>
              </div>
              <span style={metaStyle}>{receivedReturns.length} recibidas</span>
            </div>

            {receivedReturns.length === 0 ? (
              <StateCard label="No hay devoluciones recibidas pendientes de resolución." />
            ) : (
              <div style={requestGridStyle}>
                {receivedReturns.map((entry) => {
                  const order = orderLookup.get(entry.orderId);
                  const shouldRefund = refundOnReceive[entry.id] !== false;

                  return (
                    <article key={entry.id} style={requestCardStyle}>
                      <div style={betweenStyle}>
                        <div>
                          <strong style={{ color: "#fff" }}>Solicitud #{entry.id}</strong>
                          <p style={copyStyle}>Pedido #{entry.orderId}</p>
                        </div>
                        <span style={statusChipStyle(entry.status)}>
                          {returnStatusLabel(entry.status)}
                        </span>
                      </div>

                      {entry.receivedAt ? (
                        <div style={hintCardStyle}>
                          Producto recibido el {new Date(entry.receivedAt).toLocaleString("es-AR")}.
                        </div>
                      ) : null}

                      <label style={checkboxRowStyle}>
                        <input
                          type="checkbox"
                          checked={shouldRefund}
                          onChange={(event) =>
                            setRefundOnReceive((current) => ({
                              ...current,
                              [entry.id]: event.target.checked,
                            }))
                          }
                        />
                        <span>Emitir reintegro al resolver</span>
                      </label>

                      <input
                        value={refundAmounts[entry.id] ?? ""}
                        onChange={(event) =>
                          setRefundAmounts((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        placeholder={order ? `Monto sugerido ${money(order.total)}` : "Monto opcional"}
                        inputMode="decimal"
                        disabled={!shouldRefund}
                        style={{ ...fieldStyle, opacity: shouldRefund ? 1 : 0.58 }}
                      />

                      <textarea
                        value={adminNotesDrafts[entry.id] ?? entry.adminNotes ?? ""}
                        onChange={(event) =>
                          setAdminNotesDrafts((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        placeholder="Notas internas para cerrar el caso"
                        style={{ ...fieldStyle, minHeight: 84, resize: "vertical" }}
                      />

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => void resolveReceivedReturn(entry.id)}
                          disabled={processingId === entry.id}
                          style={primaryButtonStyle}
                        >
                          {processingId === entry.id
                            ? "Procesando..."
                            : shouldRefund
                              ? "Resolver y reintegrar"
                              : "Resolver sin reintegro"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Historial</p>
                <h3 style={title3Style}>Casos resueltos</h3>
              </div>
              <span style={metaStyle}>{processedReturns.length} procesadas</span>
            </div>

            {processedReturns.length === 0 ? (
              <StateCard label="Todavía no hay devoluciones procesadas." />
            ) : (
              <div style={historyGridStyle}>
                {processedReturns.map((entry) => {
                  const order = orderLookup.get(entry.orderId);

                  return (
                    <article key={entry.id} style={historyCardStyle}>
                      <div style={betweenStyle}>
                        <strong style={{ color: "#fff" }}>Solicitud #{entry.id}</strong>
                        <span style={statusChipStyle(entry.status)}>
                          {returnStatusLabel(entry.status)}
                        </span>
                      </div>
                      <p style={copyStyle}>
                        Pedido #{entry.orderId} - {order ? orderCustomerName(order) : "Cliente no disponible"}
                      </p>
                      <p style={metaStyle}>
                        Creada {new Date(entry.createdAt).toLocaleString("es-AR")}
                      </p>
                      {entry.receivedAt ? (
                        <p style={metaStyle}>
                          Recibida {new Date(entry.receivedAt).toLocaleString("es-AR")}
                        </p>
                      ) : null}
                      {entry.adminInstructions ? (
                        <div style={hintCardStyle}>
                          Instrucciones: {entry.adminInstructions}
                        </div>
                      ) : null}
                      {entry.adminNotes ? (
                        <p style={metaStyle}>Nota admin: {entry.adminNotes}</p>
                      ) : null}
                      {entry.refund ? (
                        <div style={hintCardStyle}>
                          Reintegro registrado: {money(entry.refund.amount)}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Cancelaciones resueltas</p>
                <h3 style={title3Style}>Tickets procesados</h3>
              </div>
              <span style={metaStyle}>{processedCancellations.length} procesadas</span>
            </div>

            {processedCancellations.length === 0 ? (
              <StateCard label="Todavía no hay tickets de cancelación procesados." />
            ) : (
              <div style={historyGridStyle}>
                {processedCancellations.map((entry) => (
                  <article key={entry.id} style={historyCardStyle}>
                    <div style={betweenStyle}>
                      <strong style={{ color: "#fff" }}>Ticket #{entry.id}</strong>
                      <span style={statusChipStyle(entry.status)}>
                        {returnStatusLabel(entry.status)}
                      </span>
                    </div>
                    <p style={copyStyle}>
                      Pedido #{entry.orderId} -{" "}
                      {[entry.customer?.firstName, entry.customer?.lastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || entry.customer?.email || "Cliente no disponible"}
                    </p>
                    {entry.refundAmount ? (
                      <div style={hintCardStyle}>
                        Reintegro definido: {money(entry.refundAmount)}
                      </div>
                    ) : null}
                    {entry.adminNotes ? (
                      <p style={metaStyle}>Nota admin: {entry.adminNotes}</p>
                    ) : null}
                  </article>
                ))}
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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCellStyle}>
      <span style={smallLabelStyle}>{label}</span>
      <strong style={{ color: "#fff", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}

const panelStyle: React.CSSProperties = { display: "grid", gap: 24 };
const blockStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid var(--checkout-border)", background: "var(--page-panel-bg)", padding: 22, display: "grid", gap: 16 };
const requestGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 };
const requestCardStyle: React.CSSProperties = { borderRadius: 20, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 18, display: "grid", gap: 14 };
const historyGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 };
const historyCardStyle: React.CSSProperties = { borderRadius: 18, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 16, display: "grid", gap: 10 };
const infoGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 };
const infoCellStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 14, display: "grid", gap: 6 };
const itemListStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const inlineItemStyle: React.CSSProperties = { display: "inline-flex", padding: "8px 12px", borderRadius: 999, border: "1px solid var(--checkout-border)", background: "var(--muted-field-bg)", color: "var(--account-text-strong)", fontSize: 13 };
const actionsRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(180px, 1fr) auto auto", gap: 10, alignItems: "center" };
const reviewActionsRowStyle: React.CSSProperties = { display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" };
const checkboxRowStyle: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", color: "var(--account-text-strong)" };
const fieldStyle: React.CSSProperties = { width: "100%", padding: "14px 16px", background: "var(--muted-field-bg)", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border)", borderRadius: 16, outline: "none" };
const primaryButtonStyle: React.CSSProperties = { padding: "12px 16px", background: "var(--accent-strong)", color: "var(--accent-contrast)", border: "none", borderRadius: 999, cursor: "pointer", fontWeight: 700 };
const secondaryButtonStyle: React.CSSProperties = { padding: "12px 16px", background: "transparent", color: "var(--account-text-strong)", border: "1px solid var(--checkout-border-strong)", borderRadius: 999, cursor: "pointer" };
const stateStyle: React.CSSProperties = { borderRadius: 20, border: "1px solid var(--checkout-border-strong)", background: "var(--page-panel-strong-bg)", padding: 18, color: "var(--account-text-muted)" };
const hintCardStyle: React.CSSProperties = { borderRadius: 16, border: "1px solid var(--checkout-border)", background: "var(--page-panel-strong-bg)", padding: 14, color: "var(--account-text-muted)", lineHeight: 1.6 };
const statusChipStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    status === "requested"
      ? "rgba(255,214,122,0.12)"
      : status === "approved" || status === "refunded"
        ? "rgba(184,245,194,0.12)"
        : "rgba(255,159,159,0.12)",
  color:
    status === "requested"
      ? "#ffe8ad"
      : status === "approved" || status === "refunded"
        ? "#cbffd2"
        : "#ffd6d6",
  fontSize: 12,
  fontWeight: 700,
});
const betweenStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, color: "var(--account-text-soft)" };
const title2Style: React.CSSProperties = { margin: "10px 0 0", fontSize: "clamp(1.8rem,2vw,2.6rem)", letterSpacing: "-0.05em" };
const title3Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 22, color: "var(--account-text-strong)" };
const smallLabelStyle: React.CSSProperties = { color: "var(--account-text-faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" };
const metaStyle: React.CSSProperties = { color: "var(--account-text-soft)", fontSize: 13 };
const copyStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-muted)", lineHeight: 1.7 };
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: React.CSSProperties = { margin: 0, color: "#b8f5c2" };
