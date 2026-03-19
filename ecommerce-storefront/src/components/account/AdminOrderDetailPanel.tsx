"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  money,
  orderStatusLabel,
  orderStatusTone,
  orderWorkflow,
  shipmentTimeline,
  type CustomerOrder,
} from "./order-utils";

type Props = {
  orderId: number;
  onBack: () => void;
  onOrderUpdated?: (order: CustomerOrder) => void;
};

export default function AdminOrderDetailPanel({ orderId, onBack, onOrderUpdated }: Props) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api(`/orders/${orderId}`);
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el pedido.");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [orderId]);

  const currentWorkflow = useMemo(() => (order ? orderWorkflow(order.status) : null), [order]);
  const timeline = useMemo(() => (order ? shipmentTimeline(order) : []), [order]);
  const nextAction = useMemo(() => (order ? getNextOrderAction(order.status) : null), [order]);

  const updateStatus = async (status: string) => {
    if (!order) return;

    try {
      setUpdatingStatus(true);
      setError("");
      const updated = await api(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const merged = { ...order, ...updated };
      setOrder(merged);
      onOrderUpdated?.(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <section style={panelStyle}><StateCard label="Cargando detalle operativo..." /></section>;
  }

  if (!order) {
    return (
      <section style={panelStyle}>
        <div style={betweenStyle}>
          <Header title="Detalle de pedido" copy="No se pudo recuperar este pedido." />
          <button type="button" onClick={onBack} style={ghostButtonStyle}>Volver al listado</button>
        </div>
        {error ? <p style={errorStyle}>{error}</p> : <StateCard label="Pedido no encontrado." />}
      </section>
    );
  }

  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ").trim() ||
    "Cliente sin nombre";
  const canPrintShipping = Boolean(order.shipment?.shippingAddress || order.shipment?.trackingNumber);
  const normalizedShippingMethod = order.shippingMethod?.trim().toLowerCase() ?? "";
  const isPickupOrder =
    normalizedShippingMethod.includes("pickup") ||
    normalizedShippingMethod.includes("retiro");
  const hasShippingContext =
    !isPickupOrder &&
    Boolean(
      order.shippingProvider ||
      order.shippingMethod ||
      order.shipment?.trackingNumber ||
      order.shipment?.trackingUrl ||
      order.shipment?.shippingAddress,
    );

  const downloadSummaryPdf = () => {
    const createdAt = new Date(order.createdAt).toLocaleString("es-AR");
    const units = order.items.reduce((total, item) => total + item.quantity, 0);
    const shippingLabel = hasShippingContext
      ? [order.shippingProvider, order.shippingMethod].filter(Boolean).join(" · ") || "Envio a coordinar"
      : isPickupOrder
        ? order.shippingMethod || "Retiro en tienda"
        : "Sin envio";
    const lines = [
      "RESUMEN OPERATIVO",
      `Pedido #${order.id}`,
      `Creado: ${createdAt}`,
      `Estado: ${orderStatusLabel(order.status)}`,
      "",
      "CLIENTE",
      `Nombre: ${customerName}`,
      `Email: ${order.customer?.email ?? "No disponible"}`,
      `Telefono: ${order.customer?.phone ?? "No cargado"}`,
      "",
      "OPERACION",
      `Unidades: ${units}`,
      `Entrega: ${shippingLabel}`,
      `Tracking: ${order.shipment?.trackingNumber ?? "Sin asignar"}`,
      "",
      "PRODUCTOS",
      ...order.items.flatMap((item, index) => [
        `${index + 1}. ${item.variant.product.title}`,
        `   SKU: ${item.variant.sku ?? "Sin SKU"}`,
        `   Variante: ${[item.variant.Size, item.variant.Color].filter(Boolean).join(" / ") || "Base"}`,
        `   Cantidad: ${item.quantity} | Unitario: ${money(item.price)} | Subtotal: ${money(Number(item.price) * item.quantity)}`,
      ]),
      "",
      "TOTALES",
      `Subtotal: ${money(order.subtotal)}`,
      `Descuento: ${money(order.discountAmount)}`,
      `Envio: ${money(order.shippingCost)}`,
      `Total: ${money(order.total)}`,
      "",
      "PAGOS",
      ...(order.payments?.length
        ? order.payments.map(
            (payment, index) =>
              `${index + 1}. ${payment.provider} | ${payment.status} | ${money(payment.amount)}`,
          )
        : ["No hay pagos registrados."]),
      "",
      "Documento interno de operacion generado desde el panel admin.",
    ];

    const pdfBytes = createSimplePdf(lines);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pedido-${order.id}-resumen.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section style={panelStyle}>
      <div style={betweenStyle}>
        <Header
          title={`Pedido #${order.id}`}
          copy="Panel operativo para revisar el pedido, avanzar de etapa y validar la información clave antes de despacho."
        />
        <div style={rowWrapStyle}>
          <button type="button" onClick={onBack} style={ghostButtonStyle}>
            Volver al listado
          </button>
          <button type="button" onClick={downloadSummaryPdf} style={secondaryButtonStyle}>
            Imprimir resumen
          </button>
        </div>
      </div>

      {error ? <p style={errorStyle}>{error}</p> : null}

      <div style={heroGridStyle}>
        <section style={highlightCardStyle}>
          <div style={rowWrapStyle}>
            <span style={statusBadgeStyle(order.status)}>{orderStatusLabel(order.status)}</span>
            <span style={metaPillStyle}>Creado {new Date(order.createdAt).toLocaleString("es-AR")}</span>
            {order.shipment?.trackingNumber ? (
              <span style={metaPillStyle}>Tracking {order.shipment.trackingNumber}</span>
            ) : null}
          </div>
          <h3 style={heroTitleStyle}>{currentWorkflow?.headline ?? "Seguimiento del pedido"}</h3>
          <p style={copyStyle}>{currentWorkflow?.description}</p>
          <div style={unifiedWorkflowStyle}>
            <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
              <div style={nextStepStyle}>
                <span style={smallLabelStyle}>Proximo foco</span>
                <strong style={{ color: "#fff" }}>{currentWorkflow?.nextAction ?? "Revisar manualmente el pedido."}</strong>
              </div>
              <div style={statusControlStyle}>
                <label style={labelStyle}>Accion principal</label>
                {nextAction ? (
                  <button
                    type="button"
                    onClick={() => void updateStatus(nextAction.nextStatus)}
                    disabled={updatingStatus}
                    style={primaryButtonStyle}
                  >
                    {updatingStatus ? "Actualizando..." : nextAction.label}
                  </button>
                ) : (
                  <div style={disabledActionStyle}>
                    {order.status === "delivered"
                      ? "Pedido finalizado."
                      : order.status === "cancelled"
                        ? "Pedido cancelado."
                        : "Sin siguiente paso automatico."}
                  </div>
                )}
              </div>
            </div>

            <div style={workflowMiniCardStyle}>
              <span style={smallLabelStyle}>Proceso</span>
              <div style={{ display: "grid", gap: 14 }}>
                {timeline.map((step, index) => (
                  <div key={step.key} style={timelineRowStyle}>
                    <div style={timelineRailStyle}>
                      <div style={timelineDotStyle(step.done)} />
                      {index < timeline.length - 1 ? <div style={timelineLineStyle(step.done)} /> : null}
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ color: "#fff" }}>{step.label}</strong>
                      <span style={metaStyle}>{step.done ? "Completado" : "Pendiente"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={summaryCardStyle}>
          <strong style={{ fontSize: 22 }}>Resumen rapido</strong>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Items</span>
            <strong>{order.items.length}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Unidades</span>
            <strong>{order.items.reduce((total, item) => total + item.quantity, 0)}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Subtotal</span>
            <strong>{money(order.subtotal)}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Descuento</span>
            <strong>{money(order.discountAmount)}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Envio</span>
            <strong>{money(order.shippingCost)}</strong>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <div style={summaryRowStyle}>
            <span>Total</span>
            <strong style={{ fontSize: 28 }}>{money(order.total)}</strong>
          </div>
        </section>
      </div>

      <div style={detailGridStyle}>
        <div style={{ display: "grid", gap: 20 }}>
          <section style={blockStyle}>
            <div style={betweenStyle}>
              <div>
                <p style={eyebrowStyle}>Cliente</p>
                <h3 style={title3Style}>Informacion comercial</h3>
              </div>
              <span style={metaPillStyle}>ID {order.customer?.id ?? order.customerId ?? "-"}</span>
            </div>
            <div style={infoGridStyle}>
              <InfoCell label="Nombre" value={customerName} />
              <InfoCell label="Email" value={order.customer?.email ?? "No disponible"} />
              <InfoCell label="Telefono" value={order.customer?.phone ?? "No cargado"} />
              <InfoCell label="Codigo" value={`Pedido #${order.id}`} />
            </div>
          </section>

          <section style={blockStyle}>
            <div>
              <p style={eyebrowStyle}>Productos</p>
              <h3 style={title3Style}>Contenido del pedido</h3>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {order.items.map((item) => (
                <article key={item.id} style={orderItemCardStyle}>
                  <div style={orderItemImageStyle}>
                    {item.variant.product.images?.[0]?.url ? (
                      <img
                        src={item.variant.product.images[0].url}
                        alt={item.variant.product.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : null}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <strong style={{ color: "#fff", fontSize: 18 }}>{item.variant.product.title}</strong>
                    <div style={metaColumnStyle}>
                      <span>SKU: {item.variant.sku ?? "Sin SKU"}</span>
                      <span>
                        Variante: {[item.variant.Size, item.variant.Color].filter(Boolean).join(" / ") || "Base"}
                      </span>
                      <span>Cantidad: {item.quantity}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 6, textAlign: "right" }}>
                    <span style={metaStyle}>Unitario</span>
                    <strong>{money(item.price)}</strong>
                    <span style={metaStyle}>Subtotal {money(Number(item.price) * item.quantity)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

        </div>

        <aside style={{ display: "grid", gap: 20 }}>
          {hasShippingContext ? (
          <section style={blockStyle}>
            <div>
              <p style={eyebrowStyle}>Envio</p>
              <h3 style={title3Style}>Datos logisticos</h3>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <InfoCell label="Proveedor" value={order.shippingProvider ?? "A confirmar"} />
              <InfoCell label="Metodo" value={order.shippingMethod ?? "A confirmar"} />
              <InfoCell label="Tracking" value={order.shipment?.trackingNumber ?? "Sin asignar"} />
              <InfoCell
                label="Direccion operativa"
                value={
                  order.shipment?.shippingAddress
                    ? `${order.shipment.shippingAddress} · CP ${order.shipment.postalCode ?? "-"}`
                    : "Todavia no hay snapshot de direccion guardado para este pedido."
                }
              />
            </div>
            {!order.shipment?.shippingAddress ? (
              <div style={warningCardStyle}>
                La direccion de checkout no se esta persistiendo en la orden. Para ticket de shipping real, conviene guardar una foto de entrega al momento de compra.
              </div>
            ) : null}
            <div style={rowWrapStyle}>
              {order.shipment?.trackingUrl ? (
                <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" style={primaryLinkStyle}>
                  Abrir tracking
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => window.print()}
                style={secondaryButtonStyle}
                disabled={!canPrintShipping}
                title={canPrintShipping ? "Imprimir esta vista con foco logistico" : "Faltan datos logisticos para una etiqueta util"}
              >
                Imprimir shipping
              </button>
            </div>
          </section>
          ) : null}

          <section style={blockStyle}>
            <div>
              <p style={eyebrowStyle}>Cobro</p>
              <h3 style={title3Style}>Pagos registrados</h3>
            </div>
            {order.payments?.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {order.payments.map((payment) => (
                  <article key={payment.id} style={paymentCardStyle}>
                    <strong style={{ color: "#fff" }}>{payment.provider}</strong>
                    <span style={metaStyle}>{payment.status}</span>
                    <strong>{money(payment.amount)}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <StateCard label="No hay pagos asociados todavia." />
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function Header({ title, copy }: { title: string; copy?: string }) {
  return (
    <div>
      <p style={eyebrowStyle}>Gestion</p>
      <h2 style={title2Style}>{title}</h2>
      {copy ? <p style={copyStyle}>{copy}</p> : null}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCellStyle}>
      <span style={smallLabelStyle}>{label}</span>
      <strong style={{ color: "#fff", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

function getNextOrderAction(status: string) {
  const nextActions: Record<string, { nextStatus: string; label: string }> = {
    pending: { nextStatus: "paid", label: "Confirmar pago" },
    paid: { nextStatus: "processing", label: "Iniciar preparacion" },
    processing: { nextStatus: "packed", label: "Preparacion lista" },
    packed: { nextStatus: "shipped", label: "Despachar pedido" },
    shipped: { nextStatus: "delivered", label: "Marcar como entregado" },
  };

  return nextActions[status] ?? null;
}

function createSimplePdf(lines: string[]) {
  const encoder = new TextEncoder();
  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 48;
  const startY = 790;
  const lineHeight = 16;
  const maxLinesPerPage = 44;
  const pages: string[] = [];

  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    const chunk = lines.slice(i, i + maxLinesPerPage);
    const content = [
      "BT",
      "/F1 12 Tf",
      `1 0 0 1 ${marginLeft} ${startY} Tm`,
      `${lineHeight} TL`,
    ];

    chunk.forEach((line, index) => {
      const escaped = escapePdfText(line);
      content.push(index === 0 ? `(${escaped}) Tj` : `T* (${escaped}) Tj`);
    });

    content.push("ET");
    pages.push(content.join("\n"));
  }

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  const pageRefs = pages.map((_, index) => `${index + 3} 0 R`).join(" ");
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>\nendobj`);

  const fontObjectNumber = pages.length + 3;
  const contentStartNumber = pages.length + 4;

  pages.forEach((_, index) => {
    const contentRef = `${contentStartNumber + index} 0 R`;
    objects.push(
      `${index + 3} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentRef} >>\nendobj`,
    );
  });

  objects.push(`${fontObjectNumber} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  pages.forEach((content, index) => {
    const stream = encoder.encode(content);
    const text = decoder.decode(stream);
    objects.push(
      `${contentStartNumber + index} 0 obj\n<< /Length ${stream.length} >>\nstream\n${text}\nendstream\nendobj`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return encoder.encode(pdf);
}

function escapePdfText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

const decoder = new TextDecoder();

const panelStyle: React.CSSProperties = { display: "grid", gap: 24 };
const heroGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.7fr)", gap: 20 };
const detailGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 20, alignItems: "start" };
const highlightCardStyle: React.CSSProperties = { borderRadius: 28, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg, rgba(243,238,231,0.14), rgba(255,255,255,0.04))", padding: 24, display: "grid", gap: 16 };
const summaryCardStyle: React.CSSProperties = { borderRadius: 28, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,8,8,0.42)", padding: 24, display: "grid", gap: 14, alignSelf: "stretch" };
const blockStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,8,8,0.42)", padding: 22, display: "grid", gap: 16 };
const betweenStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const rowWrapStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const infoGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 };
const infoCellStyle: React.CSSProperties = { borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 16, display: "grid", gap: 8 };
const orderItemCardStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "84px minmax(0, 1fr) auto", gap: 16, alignItems: "center", borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 16 };
const orderItemImageStyle: React.CSSProperties = { width: 84, aspectRatio: "4 / 5", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.06)" };
const metaColumnStyle: React.CSSProperties = { display: "grid", gap: 4, color: "rgba(247,241,232,0.66)", fontSize: 14 };
const timelineRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: 14, alignItems: "start" };
const timelineRailStyle: React.CSSProperties = { width: 28, display: "grid", justifyItems: "center", gap: 6 };
const timelineDotStyle = (done: boolean): React.CSSProperties => ({ width: 14, height: 14, borderRadius: "50%", background: done ? "#f7f1e8" : "rgba(255,255,255,0.2)" });
const timelineLineStyle = (done: boolean): React.CSSProperties => ({ width: 2, minHeight: 34, background: done ? "rgba(247,241,232,0.5)" : "rgba(255,255,255,0.12)" });
const paymentCardStyle: React.CSSProperties = { borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: 16, display: "grid", gap: 6 };
const warningCardStyle: React.CSSProperties = { borderRadius: 18, border: "1px solid rgba(255,173,51,0.24)", background: "rgba(255,173,51,0.08)", color: "#ffe4bf", padding: 14, lineHeight: 1.6 };
const stateStyle: React.CSSProperties = { borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", padding: 24, color: "rgba(247,241,232,0.72)" };
const unifiedWorkflowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(260px, 0.9fr) minmax(0, 1.1fr)", gap: 18, alignItems: "start" };
const statusControlStyle: React.CSSProperties = { display: "grid", gap: 8 };
const nextStepStyle: React.CSSProperties = { borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,8,8,0.3)", padding: 14, display: "grid", gap: 6, alignContent: "center" };
const workflowMiniCardStyle: React.CSSProperties = { borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,8,8,0.28)", padding: 16, display: "grid", gap: 14 };
const summaryRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" };
const heroTitleStyle: React.CSSProperties = { margin: 0, fontSize: "clamp(2rem, 2.8vw, 3rem)", letterSpacing: "-0.05em" };
const labelStyle: React.CSSProperties = { color: "rgba(247,241,232,0.68)", fontSize: 14 };
const smallLabelStyle: React.CSSProperties = { color: "rgba(247,241,232,0.48)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em" };
const metaStyle: React.CSSProperties = { color: "rgba(247,241,232,0.56)", fontSize: 13 };
const metaPillStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(247,241,232,0.7)", fontSize: 12 };
const eyebrowStyle: React.CSSProperties = { margin: 0, textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 12, color: "rgba(247,241,232,0.56)" };
const title2Style: React.CSSProperties = { margin: "10px 0 0", fontSize: "clamp(1.8rem,2vw,2.6rem)", letterSpacing: "-0.05em" };
const title3Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 22, color: "#fff" };
const copyStyle: React.CSSProperties = { margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.7, maxWidth: 740 };
const errorStyle: React.CSSProperties = { margin: 0, color: "#ff9f9f" };
const ghostButtonStyle: React.CSSProperties = { padding: "10px 14px", background: "rgba(255,255,255,0.04)", color: "#f7f1e8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { padding: "10px 14px", background: "transparent", color: "#f7f1e8", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, cursor: "pointer" };
const primaryButtonStyle: React.CSSProperties = { padding: "14px 18px", background: "#f7f1e8", color: "#0b0b0b", border: "none", borderRadius: 18, cursor: "pointer", fontWeight: 700, width: "100%" };
const disabledActionStyle: React.CSSProperties = { borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", padding: "14px 16px", color: "rgba(247,241,232,0.58)", lineHeight: 1.5 };
const primaryLinkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 14px", background: "#f7f1e8", color: "#0b0b0b", borderRadius: 999, textDecoration: "none", fontWeight: 700 };
const statusBadgeStyle = (status: string): React.CSSProperties => {
  const tone = orderStatusTone(status);
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${tone.border}`,
    background: tone.background,
    color: tone.color,
    fontSize: 12,
    fontWeight: 700,
  };
};
