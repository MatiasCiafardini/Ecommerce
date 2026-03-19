export type CustomerOrder = {
  id: number;
  customerId?: number;
  status: string;
  createdAt: string;
  subtotal: string | number;
  discountAmount?: string | number | null;
  total: string | number;
  shippingCost?: string | number | null;
  shippingProvider?: string | null;
  shippingMethod?: string | null;
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
    status: string;
    trackingUrl?: string | null;
    trackingNumber?: string | null;
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
