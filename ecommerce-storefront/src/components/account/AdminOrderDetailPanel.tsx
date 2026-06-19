"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { api, apiBlob } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { openBlobFile } from "@/lib/download";
import {
  resolveLabelNormalPrice,
  resolveStorePricingPolicy,
} from "@/lib/pricing-policy";
import AdminOrderShipmentPanel from "./AdminOrderShipmentPanel";
import {
  hasOrderShippingSnapshot,
  isCashOnPickupOrder,
  isPickupOrder,
  money,
  orderDeliveryLabel,
  orderCustomerEmail,
  orderCustomerName,
  orderCustomerPhone,
  orderShippingAddressLines,
  orderShippingRecipient,
  orderStatusLabel,
  orderStatusLabelForDelivery,
  orderStatusTone,
  paymentDisplayLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  shipmentTimeline,
  type CustomerOrder,
} from "./order-utils";

type Props = {
  orderId: number;
  onBack: () => void;
  onOrderUpdated?: (order: CustomerOrder) => void;
  showBackButton?: boolean;
};

type DetailTab = {
  id: string;
  label: string;
  hint: string;
};

const ADMIN_ORDERS_UPDATED_EVENT = "admin-orders:updated";

export default function AdminOrderDetailPanel({
  orderId,
  onBack,
  onOrderUpdated,
  showBackButton = true,
}: Props) {
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
      window.dispatchEvent(new CustomEvent(ADMIN_ORDERS_UPDATED_EVENT));
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
      window.dispatchEvent(new CustomEvent(ADMIN_ORDERS_UPDATED_EVENT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revisar el pago.");
    }
  };

  const openPaymentProof = async (proofUrl: string) => {
    try {
      setError("");
      const blob = await apiBlob(proofUrl);
      openBlobFile(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el comprobante.");
    }
  };

  const downloadOrderReceipt = async () => {
    if (!order) return;

    try {
      setError("");
      const blob = await apiBlob(`/orders/${order.id}/receipt.pdf`);
      openBlobFile(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el comprobante.");
    }
  };

  const downloadShipmentLabel = async () => {
    if (!order?.shipment) return;

    try {
      setError("");
      const blob = await apiBlob(`/admin/shipments/${order.shipment.id}/label.pdf`);
      openBlobFile(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar la etiqueta.");
    }
  };

  const downloadShipmentReceipt = async () => {
    if (!order?.shipment) return;

    try {
      setError("");
      const blob = await apiBlob(`/admin/shipments/${order.shipment.id}/receipt.pdf`);
      openBlobFile(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el comprobante de envio.");
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
          {showBackButton ? (
            <button type="button" onClick={onBack} style={ghostButtonStyle}>Volver al listado</button>
          ) : null}
        </div>
        {error ? <p style={errorStyle}>{error}</p> : <StateCard label="Pedido no encontrado." />}
      </section>
    );
  }

  const customerName = orderCustomerName(order);
  const shippingAddressLines = orderShippingAddressLines(order);
  const pickupOrder = isPickupOrder(order);
  const cashOnPickupOrder = isCashOnPickupOrder(order);
  const showManualDispatchPanel = !pickupOrder && Boolean(order.shipment);
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
  const orderPricingPolicy = resolveStorePricingPolicy({ storeId: order.storeId });
  const displayItems = order.items.map((item) => {
    const unitPrice = orderPricingPolicy.labelPriceRounding
      ? resolveLabelNormalPrice(item.price, orderPricingPolicy)
      : Number(item.price ?? 0);

    return {
      ...item,
      displayUnitPrice: unitPrice,
      displaySubtotal: unitPrice * item.quantity,
    };
  });
  const displaySubtotal = orderPricingPolicy.labelPriceRounding
    ? displayItems.reduce((sum, item) => sum + item.displaySubtotal, 0)
    : Number(order.subtotal ?? 0);
  const displayShippingCost = Number(order.shippingCost ?? 0);
  const displayTotal = Number(order.total ?? 0);
  const displayDiscountAmount = Math.max(displaySubtotal + displayShippingCost - displayTotal, 0);
  const paymentCount = order.payments?.length ?? 0;
  const paymentSummary = cashOnPickupOrder
    ? "Cobro al retirar"
    : paymentCount
      ? `${paymentCount} pago${paymentCount > 1 ? "s" : ""} registrado${paymentCount > 1 ? "s" : ""}`
      : "Sin pagos registrados";
  const deliverySummary = pickupOrder
    ? order.shippingMethod || "Retiro en tienda"
    : hasShippingContext
      ? orderDeliveryLabel(order)
      : "Entrega a confirmar";
  const displayStatusLabel = orderStatusLabelForDelivery(order);
  const trackingSummary = pickupOrder
    ? ["picked_up", "delivered"].includes(order.status)
      ? "Retiro completado en tienda"
      : ["ready_for_pickup", "shipped"].includes(order.status)
        ? "Sin tracking: esperando retiro"
        : "Sin tracking: retiro en tienda"
    : order.shipment?.trackingNumber ?? "Se cargara al despachar";
  const whatsappHref = buildWhatsappOrderLink(order);
  const shipmentProvisionPending = hasShippingContext && !pickupOrder && !order.shipment;
  const shipmentProviderCode = (
    order.shipment?.provider ||
    order.shippingProvider ||
    ""
  ).trim().toLowerCase();
  const supportsAutomaticShipmentLabel = isIntegratedShipmentProvider(shipmentProviderCode);
  const canOpenRealShipmentLabel = Boolean(
    order.shipment?.id &&
      supportsAutomaticShipmentLabel &&
      order.shipment.trackingNumber &&
      (order.shipment.labelUrl || order.shipment.labelFormat),
  );
  const packageSummary = buildLogisticsPackageSummary(order);
  const reservationLabel = formatReservationExpiry(order.reservationExpiresAt);
  const riskWarnings = buildOrderRiskWarnings(order);

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
    { id: "history", label: "Historial", hint: "Eventos internos del pedido" },
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
      `Estado: ${displayStatusLabel}`,
      "",
      "CLIENTE",
      `Nombre: ${customerName}`,
      `Email: ${orderCustomerEmail(order)}`,
      `Telefono: ${orderCustomerPhone(order)}`,
      "",
      "OPERACION",
      `Unidades: ${units}`,
      `Entrega: ${shippingLabel}`,
      pickupOrder
        ? `Retiro: ${trackingSummary}`
        : `Tracking: ${order.shipment?.trackingNumber ?? "Sin asignar"}`,
      ...(shippingAddressLines.length > 0
        ? [
            `Destinatario: ${orderShippingRecipient(order)}`,
            `Direccion: ${shippingAddressLines.join(" | ")}`,
          ]
        : []),
      "",
      "PRODUCTOS",
      ...displayItems.flatMap((item, index) => [
        `${index + 1}. ${item.variant.product.title}`,
        `   SKU: ${item.variant.sku ?? "Sin SKU"}`,
        `   Variante: ${[item.variant.Size, item.variant.Color].filter(Boolean).join(" / ") || "Base"}`,
        `   Cantidad: ${item.quantity} | Unitario: ${money(item.displayUnitPrice)} | Subtotal: ${money(item.displaySubtotal)}`,
      ]),
      "",
      "TOTALES",
      `Subtotal: ${money(displaySubtotal)}`,
      `Descuento: ${money(displayDiscountAmount)}`,
      `Envio: ${money(displayShippingCost)}`,
      `Total: ${money(displayTotal)}`,
      "",
      "PAGOS",
      ...(order.payments?.length
        ? order.payments.map(
            (payment, index) =>
              `${index + 1}. ${paymentDisplayLabel(payment)} | ${paymentStatusLabel(payment.status)} | ${money(payment.amount)}`,
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
          {showBackButton ? (
            <button type="button" onClick={onBack} style={ghostButtonStyle}>
              Volver al listado
            </button>
          ) : null}
          <button type="button" onClick={downloadSummaryPdf} style={secondaryButtonStyle}>
            Imprimir resumen
          </button>
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" style={primaryLinkStyle}>
              Contactar por WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {riskWarnings.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {riskWarnings.map((warning) => (
            <div key={warning} style={warningCardStyle}>{warning}</div>
          ))}
        </div>
      ) : null}

      <div style={heroGridStyle}>
        <section style={highlightCardStyle}>
          <div style={rowWrapStyle}>
            <span style={statusBadgeStyle(order.status)}>{displayStatusLabel}</span>
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
                    {["delivered", "picked_up"].includes(order.status)
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
          {reservationLabel ? (
            <div style={summaryRowStyle}>
              <span style={metaStyle}>Reserva</span>
              <strong>{reservationLabel}</strong>
            </div>
          ) : null}
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
            <strong>{money(displaySubtotal)}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Descuento</span>
            <strong>{money(displayDiscountAmount)}</strong>
          </div>
          <div style={summaryRowStyle}>
            <span style={metaStyle}>Envio</span>
            <strong>{money(displayShippingCost)}</strong>
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
                {cashOnPickupOrder
                  ? "Efectivo en tienda"
                  : paymentCount
                    ? paymentStatusLabel(order.payments?.[0]?.status)
                    : "Sin pago registrado"}
              </span>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--account-item-border)" }} />
          <div style={summaryRowStyle}>
            <span>Total</span>
            <strong style={{ fontSize: 28 }}>{money(displayTotal)}</strong>
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
              </div>
              <div style={infoGridStyle}>
                <InfoCell label="Nombre" value={customerName} />
                <InfoCell label="Email" value={orderCustomerEmail(order)} />
                <InfoCell label="Telefono" value={orderCustomerPhone(order)} />
                <InfoCell label="Pedido" value={`#${order.id}`} />
                <InfoCell label="Notas del cliente" value={order.customerNotesSnapshot?.trim() || "Sin notas"} />
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
                {displayItems.map((item) => (
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
                      <strong>{money(item.displayUnitPrice)}</strong>
                      <span style={metaStyle}>Subtotal {money(item.displaySubtotal)}</span>
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
                      : "Todavia no hay direccion de entrega guardada para este pedido."
                  }
                />
                <InfoCell label="Tracking URL" value={order.shipment?.trackingUrl ?? "Sin link cargado"} />
                <InfoCell label="Peso total" value={packageSummary.weight} />
                <InfoCell label="Tamano apilado" value={packageSummary.size} />
              </div>
              {!hasOrderShippingSnapshot(order) ? (
                <div style={warningCardStyle}>
                  Falta la direccion de entrega del pedido. Antes de preparar un envio, conviene confirmarla con el cliente.
                </div>
              ) : null}
              {shipmentProvisionPending ? (
                <div style={warningCardStyle}>
                  {order.shippingProvider?.trim().toLowerCase() === "correo-argentino"
                    ? `Todavia no se genero el envio en Correo Argentino. El seguimiento y la etiqueta aparecen cuando el pedido entra en la etapa de despacho. Estado actual: ${orderStatusLabel(order.status)}.`
                    : `Todavia no se preparo el despacho logistico para este pedido. El seguimiento y la etiqueta se cargan cuando el pedido entra en la etapa de despacho. Estado actual: ${orderStatusLabel(order.status)}.`}
                </div>
              ) : null}
              {order.shipment && supportsAutomaticShipmentLabel && !canOpenRealShipmentLabel ? (
                <div style={warningCardStyle}>
                  {order.shippingProvider?.trim().toLowerCase() === "correo-argentino"
                    ? "El envio ya fue solicitado, pero Correo Argentino todavia no devolvio el seguimiento o la etiqueta oficial."
                    : "El envio ya fue solicitado, pero todavia no hay una etiqueta real disponible."}
                </div>
              ) : null}
              <div style={rowWrapStyle}>
                {canOpenRealShipmentLabel ? (
                  <button
                    type="button"
                    onClick={() => void downloadShipmentLabel()}
                    style={primaryButtonStyle}
                  >
                    Descargar etiqueta PDF
                  </button>
                ) : null}
                {order.shipment ? (
                  <button type="button" onClick={() => void downloadShipmentReceipt()} style={secondaryButtonStyle}>
                    Descargar comprobante PDF
                  </button>
                ) : null}
                {order.shipment?.trackingUrl ? (
                  <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" style={primaryLinkStyle}>
                    Abrir seguimiento
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void downloadOrderReceipt()}
                  style={secondaryButtonStyle}
                >
                  Descargar comprobante de pedido
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
                      : ["ready_for_pickup", "shipped"].includes(order.status)
                        ? "Pedido listo para ser retirado."
                        : ["picked_up", "delivered"].includes(order.status)
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
                        {paymentDisplayLabel(payment)}
                      </strong>
                      <span style={metaStyle}>{paymentStatusLabel(payment.status)}</span>
                      <strong>{money(payment.amount)}</strong>
                      {payment.reference ? <span style={metaStyle}>Referencia informada: {payment.reference}</span> : null}
                      {payment.provider === "mercadopago" ? (
                        <div style={paymentDetailsGridStyle}>
                          {buildMercadoPagoRows(payment).map((row) => (
                            <div key={`${payment.id}-${row.label}`} style={paymentInfoCellStyle}>
                              <span style={smallLabelStyle}>{row.label}</span>
                              <strong style={{ color: "var(--account-text-strong)", lineHeight: 1.4 }}>
                                {row.value}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {payment.proofUrl ? (
                        <button
                          type="button"
                          onClick={() => void openPaymentProof(payment.proofUrl!)}
                          style={primaryLinkStyle}
                        >
                          Ver comprobante
                        </button>
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

          {safeActiveTab === "history" ? (
            <section style={contentBlockStyle}>
              <div>
                <p style={eyebrowStyle}>Historial interno</p>
                <h3 style={title3Style}>Eventos del pedido</h3>
              </div>
              {order.events?.length ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {order.events.map((event) => (
                    <article key={event.id} style={historyEventStyle}>
                      <div style={betweenStyle}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <strong style={{ color: "var(--account-text-strong)" }}>
                            {event.title}
                          </strong>
                          <span style={metaStyle}>
                            {new Date(event.createdAt).toLocaleString("es-AR")}
                            {event.actorType ? ` · ${formatActorLabel(event)}` : ""}
                          </span>
                        </div>
                      </div>
                      <p style={{ ...copyStyle, margin: 0 }}>{formatOrderEventMessage(event)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <StateCard label="Todavia no hay eventos registrados para este pedido." />
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

function formatActorLabel(event: NonNullable<CustomerOrder["events"]>[number]) {
  if (event.actorName?.trim()) {
    return event.actorName.trim();
  }

  const labels: Record<string, string> = {
    admin: "Admin",
    customer: "Cliente",
    system: "Sistema",
  };

  return labels[event.actorType?.trim().toLowerCase() ?? ""] ?? event.actorType ?? "Sistema";
}

function formatOrderEventMessage(event: NonNullable<CustomerOrder["events"]>[number]) {
  const metadata = event.metadata ?? {};

  if (event.type === "order.status_changed") {
    const from = typeof metadata.from === "string" ? orderStatusLabel(metadata.from) : null;
    const to = typeof metadata.to === "string" ? orderStatusLabel(metadata.to) : null;

    if (from && to) {
      return `El pedido cambio de ${from} a ${to}.`;
    }
  }

  if (event.type === "order.checkout_created") {
    return "El cliente confirmo la compra desde el checkout.";
  }

  if (event.type === "order.payment_created") {
    return "Se registro un pago asociado al pedido.";
  }

  if (event.type === "order.payment_approved") {
    return "El pago fue aprobado y el pedido puede avanzar.";
  }

  if (event.type === "order.expired") {
    return "La reserva vencio y el stock reservado fue liberado.";
  }

  return event.message?.trim() || "Se registro una actualizacion del pedido.";
}

function isIntegratedShipmentProvider(provider: string) {
  return provider === "correo-argentino" || provider === "enviopack";
}

function buildWhatsappOrderLink(order: CustomerOrder) {
  const rawPhone = orderCustomerPhone(order);
  const digits = rawPhone.replace(/\D/g, "");

  if (digits.length < 8) {
    return null;
  }

  const normalizedPhone = digits.startsWith("54")
    ? digits
    : `54${digits.replace(/^0+/, "")}`;
  const pickupOrder = isPickupOrder(order);
  const deliveryText = pickupOrder
    ? "tu pedido ya esta listo para retirar"
    : "queremos coordinar la entrega de tu pedido";
  const message = `Hola ${orderCustomerName(order)}, ${deliveryText} #${order.id}.`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function formatReservationExpiry(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `Hasta ${date.toLocaleString("es-AR")}`;
}

function buildOrderRiskWarnings(order: CustomerOrder) {
  const warnings: string[] = [];
  const phoneDigits = orderCustomerPhone(order).replace(/\D/g, "");

  if (phoneDigits.length < 8) {
    warnings.push("Este pedido no tiene un telefono confiable para coordinar entrega o retiro.");
  }

  if (order.status === "pending" && order.reservationExpiresAt) {
    const expiresAt = new Date(order.reservationExpiresAt).getTime();
    const hoursLeft = (expiresAt - Date.now()) / (60 * 60 * 1000);

    if (!Number.isNaN(hoursLeft) && hoursLeft <= 12 && hoursLeft > 0) {
      warnings.push("La reserva de stock vence en menos de 12 horas.");
    }

    if (!Number.isNaN(hoursLeft) && hoursLeft <= 0) {
      warnings.push("La reserva de stock ya esta vencida y sera liberada por el proceso automatico.");
    }
  }

  if (isPickupOrder(order) && ["ready_for_pickup", "shipped"].includes(order.status)) {
    warnings.push("Retiro pendiente: conviene contactar al cliente y registrar el retiro cuando pase por tienda.");
  }

  if (!isPickupOrder(order) && order.status === "shipped" && !order.shipment?.trackingNumber) {
    warnings.push("Envio marcado como despachado sin tracking cargado.");
  }

  return warnings;
}

function buildLogisticsPackageSummary(order: CustomerOrder) {
  let totalWeightGrams = 0;
  let stackedHeightCm = 0;
  let maxWidthCm = 0;
  let maxLengthCm = 0;

  for (const item of order.items) {
    const quantity = Math.max(Number(item.quantity) || 0, 0);
    const variant = item.variant;
    const product = variant.product;
    const weightGrams =
      positiveNumber(variant.weightGrams) ??
      kilogramsToGrams(positiveNumber(variant.weight)) ??
      positiveNumber(product.weightGrams) ??
      kilogramsToGrams(positiveNumber(product.weight));
    const heightCm =
      positiveNumber(variant.packageHeightCm) ??
      positiveNumber(variant.height) ??
      positiveNumber(product.packageHeightCm) ??
      positiveNumber(product.height);
    const widthCm =
      positiveNumber(variant.packageWidthCm) ??
      positiveNumber(variant.width) ??
      positiveNumber(product.packageWidthCm) ??
      positiveNumber(product.width);
    const lengthCm =
      positiveNumber(variant.packageLengthCm) ??
      positiveNumber(variant.length) ??
      positiveNumber(product.packageLengthCm) ??
      positiveNumber(product.length);

    if (weightGrams !== null) totalWeightGrams += weightGrams * quantity;
    if (heightCm !== null) stackedHeightCm += heightCm * quantity;
    if (widthCm !== null) maxWidthCm = Math.max(maxWidthCm, widthCm);
    if (lengthCm !== null) maxLengthCm = Math.max(maxLengthCm, lengthCm);
  }

  return {
    weight: totalWeightGrams > 0 ? formatWeight(totalWeightGrams) : "Sin peso cargado",
    size:
      stackedHeightCm > 0 && maxWidthCm > 0 && maxLengthCm > 0
        ? `${formatCm(stackedHeightCm)} alto - ${formatCm(maxWidthCm)} ancho - ${formatCm(maxLengthCm)} largo`
        : "Sin dimensiones cargadas",
  };
}

function positiveNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function kilogramsToGrams(value: number | null) {
  return value !== null ? value * 1000 : null;
}

function formatWeight(grams: number) {
  const formatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
  return grams >= 1000 ? `${formatter.format(grams / 1000)} kg` : `${formatter.format(grams)} g`;
}

function formatCm(value: number) {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)} cm`;
}

function buildMercadoPagoRows(payment: NonNullable<CustomerOrder["payments"]>[number]) {
  const metadata = payment.metadata;
  const rows = [
    {
      label: "Tipo",
      value: paymentMethodLabel(metadata?.paymentTypeId),
    },
    {
      label: "Cuotas",
      value:
        metadata?.installments !== null && metadata?.installments !== undefined
          ? String(metadata.installments)
          : null,
    },
    {
      label: "Aprobado",
      value: formatPaymentDate(metadata?.dateApproved),
    },
    {
      label: "Email pagador",
      value: metadata?.payerEmail,
    },
    {
      label: "Ultimos 4",
      value: metadata?.cardLastFourDigits,
    },
  ];

  return rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
}

function formatPaymentDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-AR");
}

function formatWebhookStatus(
  metadata?: NonNullable<NonNullable<CustomerOrder["payments"]>[number]["metadata"]> | null,
) {
  if (!metadata?.lastWebhookAt) {
    return metadata?.webhookTopic ?? null;
  }

  const label = metadata.webhookTopic ? `${metadata.webhookTopic} · ` : "";
  return `${label}${formatPaymentDate(metadata.lastWebhookAt)}`;
}

function getNextOrderAction(order: CustomerOrder) {
  const pickupOrder = isPickupOrder(order);
  const cashOnPickupOrder = isCashOnPickupOrder(order);
  const nextActions: Record<string, { nextStatus: string; label: string }> = {
    pending: cashOnPickupOrder
      ? { nextStatus: "processing", label: "Preparar pedido" }
      : { nextStatus: "paid", label: "Confirmar pago" },
    paid: { nextStatus: "processing", label: "Iniciar preparacion" },
    processing: {
      nextStatus: "packed",
      label: pickupOrder ? "Empacar y dejar listo para retiro" : "Empacar y preparar despacho",
    },
    packed: {
      nextStatus: pickupOrder ? "ready_for_pickup" : "shipped",
      label: pickupOrder ? "Marcar listo para retiro" : "Despachar pedido",
    },
    ready_for_pickup: {
      nextStatus: "picked_up",
      label: cashOnPickupOrder ? "Cobrar y marcar retirado" : "Marcar como retirado",
    },
    shipped: { nextStatus: "delivered", label: "Marcar como entregado" },
  };

  return nextActions[order.status] ?? null;
}

function getOrderWorkflow(order: CustomerOrder) {
  const cashOnPickupOrder = isCashOnPickupOrder(order);

  if (isPickupOrder(order)) {
    const workflows: Record<string, { headline: string; description: string; nextAction: string }> = {
      pending: {
        headline: cashOnPickupOrder
          ? "Pedido creado para retiro con pago en tienda."
          : "Pedido creado, esperando validacion comercial.",
        description: cashOnPickupOrder
          ? "El cliente eligio pagar en efectivo al retirar. Ahora corresponde preparar el pedido y cobrarlo cuando pase por el local."
          : "Conviene verificar stock y confirmar que el pago avance bien antes de reservarlo para retiro.",
        nextAction: cashOnPickupOrder
          ? "Preparar el pedido para retiro."
          : "Validar pago y pasar a Pagado cuando este confirmado.",
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
      ready_for_pickup: {
        headline: "Pedido disponible para retiro.",
        description: cashOnPickupOrder
          ? "Solo falta cobrar en mostrador, entregar el pedido y registrar el retiro."
          : "Solo falta entregar en mostrador y registrar que el cliente ya lo retiro.",
        nextAction: cashOnPickupOrder
          ? "Cobrar y cerrar como Retirado."
          : "Confirmar retiro y cerrar como Retirado.",
      },
      picked_up: {
        headline: "Pedido retirado.",
        description: "La operacion principal termino. Solo queda seguimiento postventa, cambios o devoluciones si aparecieran.",
        nextAction: "Monitorear postventa o cerrar caso.",
      },
      shipped: {
        headline: "Pedido disponible para retiro.",
        description: "Estado heredado de retiro. Conviene avanzar a retirado cuando se entregue en mostrador.",
        nextAction: "Confirmar retiro y cerrar como Retirado.",
      },
      delivered: {
        headline: "Pedido retirado.",
        description: "Estado heredado de retiro. La operacion principal termino.",
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

const panelStyle: React.CSSProperties = { display: "grid", gap: 24, width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" };
const heroGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
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
const paymentDetailsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  marginTop: 4,
};
const paymentInfoCellStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid var(--account-item-border)",
  background: "rgba(255,255,255,0.03)",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
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
const historyEventStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 16,
  display: "grid",
  gap: 10,
};
const historyMetadataStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
  padding: "10px 12px",
};
const historyPreStyle: React.CSSProperties = {
  margin: "10px 0 0",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  color: "var(--account-text-muted)",
  fontSize: 12,
  lineHeight: 1.6,
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
