export type CustomerOrder = {
  id: number;
  status: string;
  createdAt: string;
  subtotal: string | number;
  total: string | number;
  shippingCost?: string | number | null;
  shippingProvider?: string | null;
  shippingMethod?: string | null;
  items: Array<{
    id: number;
    quantity: number;
    price: string | number;
    variant: {
      Size?: string | null;
      Color?: string | null;
      product: {
        title: string;
        images?: Array<{ url: string }>;
      };
    };
  }>;
  shipment?: {
    status: string;
    trackingUrl?: string | null;
    trackingNumber?: string | null;
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
    status: string;
    amount: string | number;
    createdAt: string;
  }>;
};

export const money = (value: string | number | null | undefined) =>
  `$${Number(value ?? 0).toLocaleString("es-AR")}`;

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

export const shipmentTimeline = (order: CustomerOrder) => {
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
      key: "shipped",
      label: "En camino",
      done: ["shipped", "delivered"].includes(order.status) || ["in_transit", "out_for_delivery", "delivered"].includes(shipmentStatus ?? ""),
    },
    {
      key: "delivered",
      label: "Entregado",
      done: order.status === "delivered" || shipmentStatus === "delivered",
    },
  ];
};

export const openReceipt = (orderId: number) => {
  if (typeof window === "undefined") return;
  window.open(`/account/orders/${orderId}/receipt`, "_blank", "noopener,noreferrer");
};
