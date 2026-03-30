"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import AdminOrderShipmentPanel from "./AdminOrderShipmentPanel";
import {
  hasOrderShippingSnapshot,
  isPickupOrder,
  money,
  orderDeliveryLabel,
  orderCustomerEmail,
  orderCustomerName,
  orderCustomerPhone,
  orderShippingAddressLines,
  orderShippingRecipient,
  orderStatusLabel,
  orderStatusTone,
  shipmentTimeline,
  type CustomerOrder,
} from "./order-utils";

type Props = {
  orderId: number;
  onBack: () => void;
  onOrderUpdated?: (order: CustomerOrder) => void;
};

type DetailTab = {
  id: string;
  label: string;
  hint: string;
};

export default function AdminOrderDetailPanel({ orderId, onBack, onOrderUpdated }: Props) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("customer");

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

  const currentWorkflow = useMemo(() => (order ? getOrderWorkflow(order) : null), [order]);
  const timeline = useMemo(() => (order ? shipmentTimeline(order) : []), [order]);
  const nextAction = useMemo(() => (order ? getNextOrderAction(order) : null), [order]);

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

  const reviewPayment = async (paymentId: number, action: "approve" | "reject") => {
    if (!order) return;

    try {
      setError("");
      await api(`/admin/payments/${paymentId}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const refreshed = await api(`/orders/${order.id}`);
      setOrder(refreshed);
      onOrderUpdated?.(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revisar el pago.");
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

  const customerName = orderCustomerName(order);
  const shippingAddressLines = orderShippingAddressLines(order);
  const pickupOrder = isPickupOrder(order);
  const showManualDispatchPanel = !pickupOrder && Boolean(order.shipment);
  const canPrintShipping = Boolean(
    shippingAddressLines.length > 0 || order.shipment?.trackingNumber,
  );
  const hasShippingContext =
    !pickupOrder &&
    Boolean(
      order.shippingProvider ||
        order.shippingMethod ||
        order.shipment?.trackingNumber ||
        order.shipment?.trackingUrl ||
        shippingAddressLines.length > 0,
    );
  const units = order.items.reduce((total, item) => total + item.quantity, 0);
  const paymentCount = order.payments?.length ?? 0;
  const paymentSummary = paymentCount
    ? `${paymentCount} pago${paymentCount > 1 ? "s" : ""} registrado${paymentCount > 1 ? "s" : ""}`
    : "Sin pagos registrados";
  const deliverySummary = pickupOrder
    ? order.shippingMethod || "Retiro en tienda"
    : hasShippingContext
      ? orderDeliveryLabel(order)
      : "Entrega a confirmar";
  const trackingSummary = order.shipment?.trackingNumber ?? "Se cargara al despachar";

  const detailTabs: DetailTab[] = [
    { id: "customer", label: "Cliente", hint: "Contacto y datos comerciales" },
    { id: "items", label: "Productos", hint: "Contenido del pedido" },
    ...(hasShippingContext
      ? [{ id: "shipping", label: "Envio", hint: "Datos de entrega y etiqueta" }]
      : []),
    ...(showManualDispatchPanel
      ? [{ id: "dispatch", label: "Despacho", hint: "Carrier, tracking y salida" }]
      : pickupOrder
        ? [{ id: "pickup", label: "Retiro", hint: "Entrega en tienda" }]
        : []),
    { id: "payments", label: "Pagos", hint: "Cobros y conciliacion" },
  ];

  const safeActiveTab = detailTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : (detailTabs[0]?.id ?? "customer");
  const activeTabMeta = detailTabs.find((tab) => tab.id === safeActiveTab) ?? detailTabs[0];

  const downloadSummaryPdf = () => {
    const createdAt = new Date(order.createdAt).toLocaleString("es-AR");
    const shippingLabel = pickupOrder
      ? order.shippingMethod || "Retiro en tienda"
      : hasShippingContext
        ? orderDeliveryLabel(order)
        : "Sin envio";
    const lines = [
      "RESUMEN OPERATIVO",
      `Pedido #${order.id}`,
      `Creado: ${createdAt}`,
      `Estado: ${orderStatusLabel(order.status)}`,
      "",
      "CLIENTE",
      `Nombre: ${customerName}`,
      `Email: ${orderCustomerEmail(order)}`,
      `Telefono: ${orderCustomerPhone(order)}`,
      "",
      "OPERACION",
      `Unidades: ${units}`,
      `Entrega: ${shippingLabel}`,
      `Tracking: ${order.shipment?.trackingNumber ?? "Sin asignar"}`,
      ...(shippingAddressLines.length > 0
        ? [
            `Destinatario: ${orderShippingRecipient(order)}`,
            `Direccion: ${shippingAddressLines.join(" | ")}`,
          ]
        : []),
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
          copy="Panel operativo para revisar el pedido, avanzar de etapa y resolver entrega, cobro y despacho desde un unico lugar."
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
                <strong style={{ color: "var(--account-text-strong)" }}>
                  {currentWorkflow?.nextAction ?? "Revisar manualmente el pedido."}
                </strong>
              </div>
              <div style={statusControlStyle}>
                <label style={labelStyle}>Accion principal</label>
                {nextAction && !(order.status === "packed" && showManualDispatchPanel) ? (
                  <button
                    type="button"
                    onClick={() => void updateStatus(nextAction.nextStatus)}
                    disabled={updatingStatus}
                    style={primaryButtonStyle}
                  >
                    {updatingStatus ? "Actualizando..." : nextAction.label}
                  </button>
                ) : order.status === "packed" && showManualDispatchPanel ? (
                  <div style={disabledActionStyle}>
                    Completa carrier y tracking en la tab de despacho para poder marcar este pedido como enviado.
                  </div>
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
                      <strong style={{ color: "var(--account-text-strong)" }}>{step.label}</strong>
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
          <div style={summaryHighlightStyle}>
            <span style={smallLabelStyle}>Entrega</span>
            <strong style={{ color: "var(--account-text-strong)", fontSize: 18 }}>{deliverySummary}</strong>
            <span style={metaStyle}>{trackingSummary}</span>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Items</span>
            <strong>{order.items.length}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Unidades</span>
            <strong>{units}</strong>
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
          <div style={summaryMetaGridStyle}>
            <div style={summaryMetaCardStyle}>
              <span style={smallLabelStyle}>Cliente</span>
              <strong style={{ color: "var(--account-text-strong)" }}>{customerName}</strong>
              <span style={metaStyle}>{orderCustomerEmail(order)}</span>
            </div>
            <div style={summaryMetaCardStyle}>
              <span style={smallLabelStyle}>Cobro</span>
              <strong style={{ color: "var(--account-text-strong)" }}>{paymentSummary}</strong>
              <span style={metaStyle}>
                {paymentCount ? order.payments?.[0]?.status ?? "Pendiente" : "Sin conciliacion"}
              </span>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--account-item-border)" }} />
          <div style={summaryRowStyle}>
            <span>Total</span>
            <strong style={{ fontSize: 28 }}>{money(order.total)}</strong>
          </div>
        </section>
      </div>

      <section style={tabShellStyle}>
        <div style={tabHeaderWrapStyle}>
          <div style={tabHeaderCopyStyle}>
            <p style={eyebrowStyle}>Detalle operativo</p>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={title3Style}>{activeTabMeta?.label ?? "Detalle"}</h3>
              <p style={tabHintStyle}>{activeTabMeta?.hint}</p>
            </div>
          </div>

          <div style={tabRailStyle}>
            {detailTabs.map((tab) => {
              const active = tab.id === safeActiveTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={tabButtonStyle(active)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={tabBodyStyle}>
          {safeActiveTab === "customer" ? (
            <section style={contentBlockStyle}>
              <div style={betweenStyle}>
                <div>
                  <p style={eyebrowStyle}>Cliente</p>
                  <h3 style={title3Style}>Informacion comercial</h3>
                </div>
                <span style={metaPillStyle}>ID {order.customer?.id ?? order.customerId ?? "-"}</span>
              </div>
              <div style={infoGridStyle}>
                <InfoCell label="Nombre" value={customerName} />
                <InfoCell label="Email" value={orderCustomerEmail(order)} />
                <InfoCell label="Telefono" value={orderCustomerPhone(order)} />
                <InfoCell label="Codigo" value={`Pedido #${order.id}`} />
              </div>
            </section>
          ) : null}

          {safeActiveTab === "items" ? (
            <section style={contentBlockStyle}>
              <div>
                <p style={eyebrowStyle}>Productos</p>
                <h3 style={title3Style}>Contenido del pedido</h3>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {order.items.map((item) => (
                  <article key={item.id} style={orderItemCardStyle}>
                    <div style={orderItemImageStyle}>
                      {item.variant.product.images?.[0]?.url ? (
                        <Image
                          src={
                            resolveAssetUrl(item.variant.product.images[0].url) ??
                            item.variant.product.images[0].url
                          }
                          alt={item.variant.product.title}
                          width={84}
                          height={105}
                          unoptimized
                          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center center", padding: 10 }}
                        />
                      ) : null}
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <strong style={{ color: "var(--account-text-strong)", fontSize: 18 }}>{item.variant.product.title}</strong>
                      <div style={metaColumnStyle}>
                        <span>SKU: {item.variant.sku ?? "Sin SKU"}</span>
                        <span>
                          Variante: {[item.variant.Size, item.variant.Color].filter(Boolean).join(" / ") || "Base"}
                        </span>
                        <span>Cantidad: {item.quantity}</span>
                      </div>
                    </div>
                    <div style={priceColumnStyle}>
                      <span style={metaStyle}>Unitario</span>
                      <strong>{money(item.price)}</strong>
                      <span style={metaStyle}>Subtotal {money(Number(item.price) * item.quantity)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {safeActiveTab === "shipping" && hasShippingContext ? (
            <section style={contentBlockStyle}>
              <div>
                <p style={eyebrowStyle}>Envio</p>
                <h3 style={title3Style}>Datos logisticos</h3>
              </div>
              <div style={infoGridStyle}>
                <InfoCell label="Proveedor" value={order.shippingProvider ?? "A confirmar"} />
                <InfoCell label="Metodo" value={order.shippingMethod ?? "A confirmar"} />
                <InfoCell label="Tracking" value={order.shipment?.trackingNumber ?? "Sin asignar"} />
                <InfoCell label="Destinatario" value={orderShippingRecipient(order)} />
                <InfoCell
                  label="Direccion operativa"
                  value={
                    shippingAddressLines.length > 0
                      ? shippingAddressLines.join(" · ")
                      : "Todavia no hay snapshot de direccion guardado para este pedido."
                  }
                />
                <InfoCell label="Tracking URL" value={order.shipment?.trackingUrl ?? "Sin link cargado"} />
              </div>
              {!hasOrderShippingSnapshot(order) ? (
                <div style={warningCardStyle}>
                  La direccion de checkout no se esta persistiendo en la orden. Para ticket de shipping real, conviene guardar una foto de entrega al momento de compra.
                </div>
              ) : null}
              <div style={rowWrapStyle}>
                {order.shipment?.labelUrl ? (
                  <a href={order.shipment.labelUrl} target="_blank" rel="noreferrer" style={primaryLinkStyle}>
                    Descargar etiqueta
                  </a>
                ) : null}
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
                  title={
                    canPrintShipping
                      ? "Imprimir esta vista con foco logistico"
                      : "Faltan datos logisticos para una etiqueta util"
                  }
                >
                  Imprimir shipping
                </button>
              </div>
            </section>
          ) : null}

          {safeActiveTab === "dispatch" && showManualDispatchPanel ? (
            <AdminOrderShipmentPanel
              order={order}
              onOrderUpdated={(updatedOrder) => {
                setOrder(updatedOrder);
                onOrderUpdated?.(updatedOrder);
              }}
              onError={setError}
            />
          ) : null}

          {safeActiveTab === "pickup" && pickupOrder ? (
            <section style={contentBlockStyle}>
              <div>
                <p style={eyebrowStyle}>Retiro</p>
                <h3 style={title3Style}>Entrega en tienda</h3>
              </div>
              <div style={infoGridStyle}>
                <InfoCell label="Modalidad" value={order.shippingMethod ?? "Retiro en tienda"} />
                <InfoCell label="Titular" value={orderShippingRecipient(order)} />
                <InfoCell label="Telefono" value={order.customerPhoneSnapshot ?? orderCustomerPhone(order)} />
                <InfoCell
                  label="Estado operativo"
                  value={
                    order.status === "packed"
                      ? "Listo para avisar al cliente."
                      : order.status === "shipped"
                        ? "Pedido listo para ser retirado."
                        : order.status === "delivered"
                          ? "Pedido retirado por el cliente."
                          : "Preparacion en curso."
                  }
                />
              </div>
              <div style={hintCardStyle}>
                Este pedido no requiere carrier ni tracking. La operacion ideal es dejarlo listo, avisar al cliente y marcarlo como retirado cuando se entregue en mostrador.
              </div>
            </section>
          ) : null}

          {safeActiveTab === "payments" ? (
            <section style={contentBlockStyle}>
              <div>
                <p style={eyebrowStyle}>Cobro</p>
                <h3 style={title3Style}>Pagos registrados</h3>
              </div>
              {order.payments?.length ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {order.payments.map((payment) => (
                    <article key={payment.id} style={paymentCardStyle}>
                      <strong style={{ color: "var(--account-text-strong)" }}>
                        {payment.provider}
                        {payment.method ? ` · ${payment.method}` : ""}
                      </strong>
                      <span style={metaStyle}>{payment.status}</span>
                      <strong>{money(payment.amount)}</strong>
                      {payment.reference ? <span style={metaStyle}>Ref: {payment.reference}</span> : null}
                      {payment.proofUrl ? (
                        <a
                          href={payment.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={primaryLinkStyle}
                        >
                          Ver comprobante
                        </a>
                      ) : null}
                      {payment.notes ? <span style={metaStyle}>{payment.notes}</span> : null}
                      {payment.provider === "bank_transfer" && payment.status === "pending" ? (
                        <div style={rowWrapStyle}>
                          <button
                            type="button"
                            onClick={() => void reviewPayment(payment.id, "approve")}
                            style={primaryButtonStyle}
                          >
                            Aprobar pago
                          </button>
                          <button
                            type="button"
                            onClick={() => void reviewPayment(payment.id, "reject")}
                            style={secondaryButtonStyle}
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <StateCard label="No hay pagos asociados todavia." />
              )}
            </section>
          ) : null}
        </div>
      </section>
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
      <strong style={{ color: "var(--account-text-strong)", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

function getNextOrderAction(order: CustomerOrder) {
  const pickupOrder = isPickupOrder(order);
  const nextActions: Record<string, { nextStatus: string; label: string }> = {
    pending: { nextStatus: "paid", label: "Confirmar pago" },
    paid: { nextStatus: "processing", label: "Iniciar preparacion" },
    processing: {
      nextStatus: "packed",
      label: pickupOrder ? "Empacar y dejar listo para retiro" : "Empacar y preparar despacho",
    },
    packed: {
      nextStatus: "shipped",
      label: pickupOrder ? "Marcar listo para retiro" : "Despachar pedido",
    },
    shipped: {
      nextStatus: "delivered",
      label: pickupOrder ? "Marcar como retirado" : "Marcar como entregado",
    },
  };

  return nextActions[order.status] ?? null;
}

function getOrderWorkflow(order: CustomerOrder) {
  if (isPickupOrder(order)) {
    const workflows: Record<string, { headline: string; description: string; nextAction: string }> = {
      pending: {
        headline: "Pedido creado, esperando validacion comercial.",
        description: "Conviene verificar stock y confirmar que el pago avance bien antes de reservarlo para retiro.",
        nextAction: "Validar pago y pasar a Pagado cuando este confirmado.",
      },
      paid: {
        headline: "Pago recibido, listo para preparar el retiro.",
        description: "Ya se puede bajar a operacion: picking, control de items y armado del paquete para mostrador.",
        nextAction: "Liberar a Preparacion para comenzar picking.",
      },
      processing: {
        headline: "Pedido en preparacion para retiro.",
        description: "El foco operativo ahora es reunir productos, controlar variantes y dejar el paquete listo para avisar al cliente.",
        nextAction: "Completar picking y mover a Empacado.",
      },
      packed: {
        headline: "Pedido empacado y listo para retiro.",
        description: "En esta etapa conviene confirmar titular, contacto y observaciones antes de notificar que ya puede pasar por tienda.",
        nextAction: "Marcar listo para retiro.",
      },
      shipped: {
        headline: "Pedido disponible para retiro.",
        description: "Solo falta entregar en mostrador y registrar que el cliente ya lo retiro.",
        nextAction: "Confirmar retiro y cerrar como Entregado.",
      },
      delivered: {
        headline: "Pedido retirado.",
        description: "La operacion principal termino. Solo queda seguimiento postventa, cambios o devoluciones si aparecieran.",
        nextAction: "Monitorear postventa o cerrar caso.",
      },
      cancelled: {
        headline: "Pedido cancelado.",
        description: "No deberia seguir avanzando. Revisar si ya se liberaron reservas y si hace falta una comunicacion al cliente.",
        nextAction: "Confirmar liberacion de stock y cierre administrativo.",
      },
      refunded: {
        headline: "Pedido reintegrado.",
        description: "El pedido ya quedo fuera del flujo operativo normal y pasa a control postventa/finanzas.",
        nextAction: "Registrar conciliacion del reintegro.",
      },
    };

    return workflows[order.status] ?? {
      headline: "Estado no mapeado.",
      description: "Revisar manualmente el pedido.",
      nextAction: "Actualizar definicion del workflow.",
    };
  }

  const workflows: Record<string, { headline: string; description: string; nextAction: string }> = {
    pending: {
      headline: "Pedido creado, esperando validacion comercial.",
      description: "Conviene verificar stock, detectar fraude basico y confirmar que el medio de pago avance correctamente antes de moverlo.",
      nextAction: "Validar pago y pasar a Pagado cuando este confirmado.",
    },
    paid: {
      headline: "Pago recibido, listo para entrar a preparacion.",
      description: "Ya se puede bajar a operacion: picking, control de items y coordinacion de empaque.",
      nextAction: "Liberar a Preparacion para comenzar picking.",
    },
    processing: {
      headline: "Pedido en preparacion.",
      description: "El foco operativo ahora es juntar productos, controlar variantes y dejar todo listo para empaquetado.",
      nextAction: "Completar picking y mover a Empacado.",
    },
    packed: {
      headline: "Pedido empacado y listo para despacho.",
      description: "En esta etapa conviene validar etiqueta, tracking y datos logisticos antes de entregarlo al carrier.",
      nextAction: "Despachar y mover a Enviado.",
    },
    shipped: {
      headline: "Pedido ya salio al carrier.",
      description: "Hace falta monitorear tracking y excepciones hasta la entrega final.",
      nextAction: "Seguir tracking hasta confirmar Entregado.",
    },
    delivered: {
      headline: "Pedido entregado.",
      description: "La operacion principal termino. Solo queda seguimiento postventa, cambios o devoluciones si aparecieran.",
      nextAction: "Monitorear postventa o cerrar caso.",
    },
    cancelled: {
      headline: "Pedido cancelado.",
      description: "No deberia seguir avanzando. Revisar si ya se liberaron reservas y si hace falta una comunicacion al cliente.",
      nextAction: "Confirmar liberacion de stock y cierre administrativo.",
    },
    refunded: {
      headline: "Pedido reintegrado.",
      description: "El pedido ya quedo fuera del flujo operativo normal y pasa a control postventa/finanzas.",
      nextAction: "Registrar conciliacion del reintegro.",
    },
  };

  return workflows[order.status] ?? {
    headline: "Estado no mapeado.",
    description: "Revisar manualmente el pedido.",
    nextAction: "Actualizar definicion del workflow.",
  };
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
const heroGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
};
const highlightCardStyle: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid var(--account-item-border)",
  background: "linear-gradient(180deg, color-mix(in srgb, var(--page-panel-bg) 94%, var(--admin-chip-selected-bg) 6%), var(--page-panel-bg))",
  padding: 24,
  display: "grid",
  gap: 16,
};
const summaryCardStyle: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
  padding: 24,
  display: "grid",
  gap: 14,
  alignSelf: "stretch",
  alignContent: "start",
};
const summaryHighlightStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 8,
};
const summaryMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const summaryMetaCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 14,
  display: "grid",
  gap: 6,
};
const tabShellStyle: React.CSSProperties = {
  borderRadius: 28,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
  display: "grid",
  overflow: "hidden",
};
const tabHeaderWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  padding: 24,
  borderBottom: "1px solid var(--account-item-border)",
  background: "linear-gradient(180deg, color-mix(in srgb, var(--account-item-bg) 88%, transparent), transparent)",
};
const tabHeaderCopyStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};
const tabRailStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  overflowX: "auto",
  paddingBottom: 2,
  scrollbarWidth: "thin",
};
const tabBodyStyle: React.CSSProperties = {
  padding: 24,
  display: "grid",
  gap: 18,
};
const contentBlockStyle: React.CSSProperties = { display: "grid", gap: 18 };
const betweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
const rowWrapStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};
const infoCellStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 8,
};
const orderItemCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "84px minmax(0, 1fr)",
  gap: 16,
  alignItems: "center",
  borderRadius: 22,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
};
const orderItemImageStyle: React.CSSProperties = {
  width: 84,
  aspectRatio: "4 / 5",
  borderRadius: 16,
  overflow: "hidden",
  background: "var(--product-media-fallback)",
};
const priceColumnStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  textAlign: "left",
};
const metaColumnStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  color: "var(--account-text-muted)",
  fontSize: 14,
};
const timelineRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
};
const timelineRailStyle: React.CSSProperties = { width: 28, display: "grid", justifyItems: "center", gap: 6 };
const timelineDotStyle = (done: boolean): React.CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: "50%",
  background: done ? "var(--accent-strong)" : "var(--account-item-border)",
});
const timelineLineStyle = (done: boolean): React.CSSProperties => ({
  width: 2,
  minHeight: 34,
  background: done ? "color-mix(in srgb, var(--accent-strong) 42%, transparent)" : "var(--account-item-border)",
});
const paymentCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 6,
};
const warningCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--admin-tone-warning-border)",
  background: "var(--admin-tone-warning-bg)",
  color: "var(--admin-tone-warning-color)",
  padding: 14,
  lineHeight: 1.6,
};
const hintCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-muted)",
  padding: 14,
  lineHeight: 1.6,
};
const stateStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 24,
  color: "var(--account-text-muted)",
};
const unifiedWorkflowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
  alignItems: "start",
};
const statusControlStyle: React.CSSProperties = { display: "grid", gap: 8 };
const nextStepStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 14,
  display: "grid",
  gap: 6,
  alignContent: "center",
};
const workflowMiniCardStyle: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 14,
};
const summaryRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};
const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2rem, 2.8vw, 3rem)",
  letterSpacing: "-0.05em",
};
const labelStyle: React.CSSProperties = { color: "var(--account-text-muted)", fontSize: 14 };
const smallLabelStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
};
const metaStyle: React.CSSProperties = { color: "var(--account-text-soft)", fontSize: 13 };
const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};
const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};
const title2Style: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(1.8rem,2vw,2.6rem)",
  letterSpacing: "-0.05em",
};
const title3Style: React.CSSProperties = { margin: "8px 0 0", fontSize: 22, color: "var(--account-text-strong)" };
const tabHintStyle: React.CSSProperties = { margin: 0, color: "var(--account-text-muted)", lineHeight: 1.6 };
const copyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
  maxWidth: 740,
};
const errorStyle: React.CSSProperties = { margin: 0, color: "var(--admin-danger-color)" };
const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border)",
  borderRadius: 999,
  cursor: "pointer",
};
const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border-active)",
  borderRadius: 999,
  cursor: "pointer",
};
const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  border: "none",
  borderRadius: 18,
  cursor: "pointer",
  fontWeight: 700,
  width: "100%",
};
const disabledActionStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: "14px 16px",
  color: "var(--account-text-soft)",
  lineHeight: 1.5,
};
const primaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 700,
};
const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: "0 0 auto",
  padding: "12px 16px",
  borderRadius: 999,
  border: active ? "1px solid var(--account-item-border-active)" : "1px solid var(--account-item-border)",
  background: active ? "var(--admin-chip-selected-bg)" : "var(--account-item-bg)",
  color: active ? "var(--admin-chip-selected-color)" : "var(--account-text-strong)",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
});
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
