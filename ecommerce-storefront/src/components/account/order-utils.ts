import { apiBlob } from "@/lib/api";
import { downloadBlobFile } from "@/lib/download";
import { formatCurrency } from "@/lib/currency";

export type CustomerOrder = {
  id: number;
  customerId?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  subtotal: string | number;
  discountAmount?: string | number | null;
  discountCode?: string | null;
  total: string | number;
  shippingCost?: string | number | null;
  shippingProvider?: string | null;
  shippingMethod?: string | null;
  customerEmailSnapshot?: string | null;
  customerFirstNameSnapshot?: string | null;
  customerLastNameSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  shippingFirstNameSnapshot?: string | null;
  shippingLastNameSnapshot?: string | null;
  shippingPhoneSnapshot?: string | null;
  shippingAddress1Snapshot?: string | null;
  shippingAddress2Snapshot?: string | null;
  shippingCitySnapshot?: string | null;
  shippingStateSnapshot?: string | null;
  shippingPostalCodeSnapshot?: string | null;
  shippingCountrySnapshot?: string | null;
  customer?: {
    id: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
  items: Array<{
    id: number;
    quantity: number;
    returnedQuantity?: number;
    price: string | number;
    variant: {
      sku?: string | null;
      Size?: string | null;
      Color?: string | null;
      product: {
        title: string;
        images?: Array<{ url: string }>;
      };
    };
  }>;
  shipment?: {
    id?: string;
    status: string;
    carrier?: string | null;
    externalShipmentId?: string | null;
    trackingUrl?: string | null;
    trackingNumber?: string | null;
    labelUrl?: string | null;
    labelFormat?: string | null;
    internalNotes?: string | null;
    shippingAddress?: string | null;
    postalCode?: string | null;
    trackingEvents?: Array<{
      id: string;
      status: string;
      description?: string | null;
      location?: string | null;
      createdAt: string;
    }>;
  } | null;
  payments?: Array<{
    id: number;
    provider: string;
    method?: string | null;
    status: string;
    amount: string | number;
    externalId?: string | null;
    reference?: string | null;
    proofUrl?: string | null;
    proofFilename?: string | null;
    notes?: string | null;
    reviewedAt?: string | null;
    metadata?: {
      gateway?: string | null;
      paymentMethodId?: string | null;
      paymentTypeId?: string | null;
      installments?: string | number | null;
      issuerId?: string | null;
      statusDetail?: string | null;
      transactionAmount?: string | number | null;
      currencyId?: string | null;
      externalReference?: string | null;
      merchantOrderId?: string | null;
      statementDescriptor?: string | null;
      authorizationCode?: string | null;
      dateApproved?: string | null;
      dateCreated?: string | null;
      dateLastUpdated?: string | null;
      payerEmail?: string | null;
      payerIdentification?: string | null;
      cardLastFourDigits?: string | null;
      liveMode?: boolean | null;
      webhookTopic?: string | null;
      webhookResourceId?: string | null;
      lastWebhookAt?: string | null;
      source?: string | null;
    } | null;
    createdAt: string;
    updatedAt?: string;
  }>;
  returns?: Array<{
    id: number;
    reason?: string | null;
    status: string;
    adminInstructions?: string | null;
    adminNotes?: string | null;
    customerShipmentCarrier?: string | null;
    customerShipmentTracking?: string | null;
    customerShipmentProofUrl?: string | null;
    approvedAt?: string | null;
    shippedAt?: string | null;
    receivedAt?: string | null;
    resolvedAt?: string | null;
    createdAt: string;
    items: Array<{
      id: number;
      orderItemId: number;
      quantity: number;
    }>;
    refund?: {
      id: number;
      amount: string | number;
      createdAt: string;
    } | null;
  }>;
  refunds?: Array<{
    id: number;
    amount: string | number;
    createdAt: string;
  }>;
  cancellationRequests?: Array<{
    id: number;
    reason?: string | null;
    status: "requested" | "approved" | "rejected" | "refunded";
    refundAmount?: string | number | null;
    adminNotes?: string | null;
    createdAt: string;
    updatedAt: string;
    reviewedAt?: string | null;
  }>;
};

export const money = (value: string | number | null | undefined) => formatCurrency(value);

export const orderCustomerName = (order: CustomerOrder) =>
  [
    order.customerFirstNameSnapshot ?? order.customer?.firstName,
    order.customerLastNameSnapshot ?? order.customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Cliente sin nombre";

export const orderCustomerEmail = (order: CustomerOrder) =>
  order.customerEmailSnapshot ?? order.customer?.email ?? "No disponible";

export const orderCustomerPhone = (order: CustomerOrder) =>
  order.customerPhoneSnapshot ?? order.customer?.phone ?? "No cargado";

export const isPickupOrder = (order: {
  shippingMethod?: string | null;
  shippingProvider?: string | null;
}) => {
  const shippingMethod = order.shippingMethod?.trim().toLowerCase() ?? "";
  const shippingProvider = order.shippingProvider?.trim().toLowerCase() ?? "";

  return (
    shippingMethod.includes("pickup") ||
    shippingMethod.includes("retiro") ||
    shippingProvider === "store"
  );
};

export const orderDeliveryLabel = (order: CustomerOrder) => {
  if (isPickupOrder(order)) {
    return order.shippingMethod || "Retiro en tienda";
  }

  return [order.shippingProvider, order.shippingMethod].filter(Boolean).join(" · ") || "Envio a coordinar";
};

export const orderShippingRecipient = (order: CustomerOrder) =>
  [
    order.shippingFirstNameSnapshot,
    order.shippingLastNameSnapshot,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || orderCustomerName(order);

export const orderShippingAddressLines = (order: CustomerOrder) => {
  const lines = [
    order.shippingAddress1Snapshot,
    order.shippingAddress2Snapshot,
    [
      order.shippingCitySnapshot,
      order.shippingStateSnapshot,
    ]
      .filter(Boolean)
      .join(", "),
    [order.shippingCountrySnapshot, order.shippingPostalCodeSnapshot ? `CP ${order.shippingPostalCodeSnapshot}` : null]
      .filter(Boolean)
      .join(" · "),
  ].filter(Boolean) as string[];

  if (lines.length > 0) {
    return lines;
  }

  if (order.shipment?.shippingAddress) {
    return [
      `${order.shipment.shippingAddress}${order.shipment.postalCode ? ` · CP ${order.shipment.postalCode}` : ""}`,
    ];
  }

  return [];
};

export const hasOrderShippingSnapshot = (order: CustomerOrder) =>
  orderShippingAddressLines(order).length > 0;

export const orderStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    processing: "En preparacion",
    packed: "Empacado",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
    refunded: "Reintegrado",
  };

  return labels[status] ?? status;
};

export const orderStatusTone = (status: string) => {
  const tones: Record<string, { background: string; border: string; color: string }> = {
    pending: {
      background: "rgba(255,214,122,0.12)",
      border: "rgba(255,214,122,0.3)",
      color: "#ffe8ad",
    },
    paid: {
      background: "rgba(184,245,194,0.12)",
      border: "rgba(184,245,194,0.3)",
      color: "#cbffd2",
    },
    processing: {
      background: "rgba(129,199,255,0.12)",
      border: "rgba(129,199,255,0.3)",
      color: "#d2efff",
    },
    packed: {
      background: "rgba(198,179,255,0.14)",
      border: "rgba(198,179,255,0.3)",
      color: "#efe6ff",
    },
    shipped: {
      background: "rgba(134,239,172,0.12)",
      border: "rgba(134,239,172,0.26)",
      color: "#d5ffe1",
    },
    delivered: {
      background: "rgba(247,241,232,0.12)",
      border: "rgba(247,241,232,0.18)",
      color: "#f7f1e8",
    },
    cancelled: {
      background: "rgba(255,159,159,0.12)",
      border: "rgba(255,159,159,0.28)",
      color: "#ffd6d6",
    },
    refunded: {
      background: "rgba(255,195,113,0.12)",
      border: "rgba(255,195,113,0.3)",
      color: "#ffe7c3",
    },
  };

  return tones[status] ?? {
    background: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.12)",
    color: "#f7f1e8",
  };
};

export const orderWorkflow = (status: string) => {
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

  return workflows[status] ?? {
    headline: "Estado no mapeado.",
    description: "Revisar manualmente el pedido.",
    nextAction: "Actualizar definicion del workflow.",
  };
};

export const shipmentTimeline = (order: CustomerOrder) => {
  const pickupOrder = isPickupOrder(order);
  const shipmentStatus = order.shipment?.status ?? null;

  return [
    { key: "pending", label: "Compra creada", done: true },
    {
      key: "paid",
      label: "Pago confirmado",
      done: ["paid", "processing", "packed", "shipped", "delivered", "refunded"].includes(order.status),
    },
    {
      key: "processing",
      label: "Preparando pedido",
      done: ["processing", "packed", "shipped", "delivered"].includes(order.status),
    },
    {
      key: pickupOrder ? "ready_for_pickup" : "shipped",
      label: pickupOrder ? "Listo para retiro" : "En camino",
      done: pickupOrder
        ? ["packed", "shipped", "delivered"].includes(order.status)
        : ["shipped", "delivered"].includes(order.status) || ["in_transit", "out_for_delivery", "delivered"].includes(shipmentStatus ?? ""),
    },
    {
      key: pickupOrder ? "collected" : "delivered",
      label: pickupOrder ? "Retirado" : "Entregado",
      done: order.status === "delivered" || (!pickupOrder && shipmentStatus === "delivered"),
    },
  ];
};

export const openReceipt = async (orderId: number) => {
  if (typeof window === "undefined") return;
  const blob = await apiBlob(`/customers/me/orders/${orderId}/receipt.pdf`);
  downloadBlobFile(blob, `comprobante-pedido-${orderId}.pdf`);
};

export const canCustomerCancelOrder = (order: CustomerOrder) =>
  order.status === "pending" &&
  !["shipped", "in_transit", "delivered"].includes(order.shipment?.status ?? "");

export const canCustomerRequestCancellation = (order: CustomerOrder) =>
  ["paid", "processing", "packed"].includes(order.status) &&
  !["shipped", "in_transit", "delivered"].includes(order.shipment?.status ?? "") &&
  !(order.cancellationRequests ?? []).some((request) => request.status === "requested");

export const canCustomerRequestReturn = (order: CustomerOrder) =>
  order.status === "delivered" &&
  order.items.some(
    (item) => Number(item.quantity ?? 0) - Number(item.returnedQuantity ?? 0) > 0,
  );
