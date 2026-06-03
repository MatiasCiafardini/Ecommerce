import {
  isCashOnPickupOrder,
  isPickupOrder,
  orderCustomerEmail,
  orderCustomerName,
  orderCustomerPhone,
  orderDeliveryLabel,
  orderStatusLabel,
  orderStatusLabelForDelivery,
  paymentDisplayLabel,
  paymentStatusLabel,
  type CustomerOrder,
} from "../order-utils";

export const ADMIN_ORDERS_UPDATED_EVENT = "admin-orders:updated";
export const ADMIN_ORDERS_POLL_INTERVAL_MS = 15_000;

export type OrderQueueFilter =
  | "all"
  | "new"
  | "payment_pending"
  | "to_prepare"
  | "ready_for_pickup"
  | "shipping"
  | "issues"
  | "completed";

export type OrderQueueMetrics = {
  all: number;
  newOrders: number;
  paymentPending: number;
  toPrepare: number;
  readyForPickup: number;
  shipping: number;
  issues: number;
  completed: number;
};

export const orderQueueFilters: Array<{
  id: OrderQueueFilter;
  label: string;
  count: (metrics: OrderQueueMetrics) => number;
}> = [
  { id: "all", label: "Todos", count: (metrics) => metrics.all },
  { id: "new", label: "Nuevos", count: (metrics) => metrics.newOrders },
  { id: "payment_pending", label: "Pago pendiente", count: (metrics) => metrics.paymentPending },
  { id: "to_prepare", label: "Para preparar", count: (metrics) => metrics.toPrepare },
  { id: "ready_for_pickup", label: "Listos para retiro", count: (metrics) => metrics.readyForPickup },
  { id: "shipping", label: "Envios", count: (metrics) => metrics.shipping },
  { id: "issues", label: "Problemas", count: (metrics) => metrics.issues },
  { id: "completed", label: "Finalizados", count: (metrics) => metrics.completed },
];

export function buildOrdersSignature(orders: CustomerOrder[]) {
  return orders
    .map((order) => `${order.id}:${order.status}:${order.updatedAt ?? order.createdAt}`)
    .join("|");
}

export function buildOrderQueueMetrics(orders: CustomerOrder[]): OrderQueueMetrics {
  return orders.reduce<OrderQueueMetrics>(
    (metrics, order) => {
      metrics.all += 1;
      if (matchesOrderFilter(order, "new")) metrics.newOrders += 1;
      if (matchesOrderFilter(order, "payment_pending")) metrics.paymentPending += 1;
      if (matchesOrderFilter(order, "to_prepare")) metrics.toPrepare += 1;
      if (matchesOrderFilter(order, "ready_for_pickup")) metrics.readyForPickup += 1;
      if (matchesOrderFilter(order, "shipping")) metrics.shipping += 1;
      if (matchesOrderFilter(order, "issues")) metrics.issues += 1;
      if (matchesOrderFilter(order, "completed")) metrics.completed += 1;
      return metrics;
    },
    {
      all: 0,
      newOrders: 0,
      paymentPending: 0,
      toPrepare: 0,
      readyForPickup: 0,
      shipping: 0,
      issues: 0,
      completed: 0,
    },
  );
}

export function matchesOrderFilter(order: CustomerOrder, filter: OrderQueueFilter) {
  switch (filter) {
    case "all":
      return true;
    case "new":
      return order.status === "pending";
    case "payment_pending":
      return isPaymentPending(order);
    case "to_prepare":
      return ["paid", "processing", "packed"].includes(order.status);
    case "ready_for_pickup":
      return isPickupOrder(order) && ["ready_for_pickup", "shipped"].includes(order.status);
    case "shipping":
      return !isPickupOrder(order) && ["packed", "shipped"].includes(order.status);
    case "issues":
      return orderIssueLabels(order).length > 0;
    case "completed":
      return ["delivered", "picked_up", "cancelled", "refunded"].includes(order.status);
    default:
      return true;
  }
}

export function orderMatchesQuery(order: CustomerOrder, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    `pedido ${order.id}`,
    String(order.id),
    orderCustomerName(order),
    orderCustomerEmail(order),
    orderCustomerPhone(order),
    order.status,
    orderStatusLabelForDelivery(order),
    primaryPaymentLabel(order),
    orderDeliveryLabel(order),
    order.shippingMethod,
    order.shippingProvider,
    order.shipment?.trackingNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function primaryPayment(order: CustomerOrder) {
  return order.payments?.[0] ?? null;
}

export function primaryPaymentStatus(order: CustomerOrder) {
  const payment = primaryPayment(order);
  const status = payment?.status?.trim().toLowerCase() ?? "";

  if (isCashOnPickupOrder(order)) {
    return "pending";
  }

  if (
    ["approved", "paid"].includes(status) ||
    ["paid", "processing", "packed", "ready_for_pickup", "picked_up", "shipped", "delivered"].includes(order.status)
  ) {
    return "paid";
  }

  if (["rejected", "cancelled", "canceled"].includes(status)) {
    return "cancelled";
  }

  return "pending";
}

export function primaryPaymentLabel(order: CustomerOrder) {
  const payment = primaryPayment(order);

  if (isCashOnPickupOrder(order)) {
    return "Cobro al retirar";
  }

  if (!payment) {
    return order.status === "pending" ? "Pendiente" : "Sin pago";
  }

  return paymentStatusLabel(payment.status);
}

export function primaryPaymentMethod(order: CustomerOrder) {
  const payment = primaryPayment(order);
  if (isCashOnPickupOrder(order)) {
    return "Efectivo en tienda";
  }
  return payment ? paymentDisplayLabel(payment) : "Sin pago registrado";
}

export function isPaymentPending(order: CustomerOrder) {
  return primaryPaymentStatus(order) === "pending" && !isCashOnPickupOrder(order) && !["cancelled", "refunded"].includes(order.status);
}

export function getOrderQueueAction(order: CustomerOrder) {
  const pickupOrder = isPickupOrder(order);
  const cashOnPickupOrder = isCashOnPickupOrder(order);
  const actions: Record<string, { nextStatus: string; label: string }> = {
    pending: cashOnPickupOrder
      ? { nextStatus: "processing", label: "Preparar pedido" }
      : { nextStatus: "paid", label: "Confirmar pago" },
    paid: {
      nextStatus: pickupOrder ? "ready_for_pickup" : "processing",
      label: pickupOrder ? "Listo para retiro" : "Preparar",
    },
    processing: { nextStatus: "packed", label: "Empacar" },
    ready_for_pickup: {
      nextStatus: "picked_up",
      label: cashOnPickupOrder ? "Cobrar y retirar" : "Marcar retirado",
    },
    shipped: {
      nextStatus: pickupOrder ? "picked_up" : "delivered",
      label: pickupOrder ? "Marcar retirado" : "Entregado",
    },
  };

  if (order.status === "packed") {
    if (pickupOrder) return { nextStatus: "ready_for_pickup", label: "Listo para retiro" };
    if (order.shipment) return { nextStatus: "shipped", label: "Marcar enviado" };
    return null;
  }

  return actions[order.status] ?? null;
}

export function orderIssueLabels(order: CustomerOrder) {
  const issues: string[] = [];
  const phone = orderCustomerPhone(order);
  const payment = primaryPayment(order);
  const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / 36e5;

  if (!phone || phone === "No cargado") {
    issues.push("Falta telefono");
  }

  if (payment?.provider === "bank_transfer" && payment.status === "pending") {
    issues.push("Validar transferencia");
  }

  if (order.status === "pending" && ageHours >= 24) {
    issues.push("Pendiente hace 24 h");
  }

  if (!isPickupOrder(order) && order.status === "packed" && !order.shipment) {
    issues.push("Falta despacho");
  }

  if (isPickupOrder(order) && ["ready_for_pickup", "shipped"].includes(order.status)) {
    issues.push("Avisar/retiro pendiente");
  }

  return issues;
}

export { isPickupOrder, orderCustomerName, orderCustomerPhone, orderDeliveryLabel, orderStatusLabelForDelivery };
