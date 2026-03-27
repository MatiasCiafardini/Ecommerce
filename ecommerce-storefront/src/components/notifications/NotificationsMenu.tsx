"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { money, orderStatusLabel, type CustomerOrder } from "@/components/account/order-utils";

type ReturnNotificationEntry = {
  id: number;
  orderId: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  href: string;
};

const readStorageKey = (userId: number, role?: string) =>
  `notifications:last-seen:${role ?? "customer"}:${userId}`;

export function NotificationsMenuInner({
  mobileSheet = false,
}: {
  mobileSheet?: boolean;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = Boolean(user?.role && user.role !== "CUSTOMER");

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLastSeenAt(null);
      return;
    }

    const storageKey = readStorageKey(user.id, user.role);
    setLastSeenAt(localStorage.getItem(storageKey));

    const loadNotifications = async () => {
      try {
        setLoading(true);

        if (isAdmin) {
          const [ordersData, returnsData] = await Promise.all([api("/orders"), api("/returns")]);
          const orderNotifications = buildAdminOrderNotifications(
            Array.isArray(ordersData) ? (ordersData as CustomerOrder[]) : [],
          );
          const returnNotifications = buildAdminReturnNotifications(
            Array.isArray(returnsData) ? (returnsData as ReturnNotificationEntry[]) : [],
          );

          setItems([...orderNotifications, ...returnNotifications].sort(compareNotifications));
          return;
        }

        const ordersData = await api("/customers/me/orders");
        setItems(
          buildCustomerNotifications(
            Array.isArray(ordersData) ? (ordersData as CustomerOrder[]) : [],
          ).sort(compareNotifications),
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void loadNotifications();
  }, [isAdmin, user]);

  useEffect(() => {
    if (!open || !user) return;

    const now = new Date().toISOString();
    const storageKey = readStorageKey(user.id, user.role);
    localStorage.setItem(storageKey, now);
    setLastSeenAt(now);
  }, [open, user]);

  useEffect(() => {
    if (!open) return;

    if (mobileSheet) {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      };

      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileSheet, open]);

  useEffect(() => {
    if (!open || !mobileSheet) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSheet, open]);

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return items.length;
    const seenTimestamp = new Date(lastSeenAt).getTime();
    return items.filter((item) => new Date(item.createdAt).getTime() > seenTimestamp).length;
  }, [items, lastSeenAt]);

  if (!user) {
    return null;
  }

  return (
    <div ref={panelRef} style={shellStyle}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={triggerStyle(open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} nuevas` : ""}`}
        title="Notificaciones"
      >
        <BellIcon />
        {unreadCount > 0 ? <span style={badgeStyle}>{unreadCount}</span> : null}
      </button>

      {open ? (
        mobileSheet ? (
          <>
            <div
              style={mobileSheetOverlayStyle}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div style={mobilePopoverStyle}>
              <div style={dropdownHeaderStyle}>
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "var(--notification-text-strong, #fff)",
                    }}
                  >
                    {isAdmin ? "Alertas del operador" : "Novedades de tu cuenta"}
                  </strong>
                  <span style={metaStyle}>
                    {loading
                      ? "Actualizando..."
                      : unreadCount > 0
                        ? `${unreadCount} nueva${unreadCount === 1 ? "" : "s"}`
                        : "Todo al dia"}
                  </span>
                </div>
              </div>

              <div className="theme-vertical-scroll" style={listStyle}>
                {loading ? (
                  <div style={emptyStyle}>Cargando notificaciones...</div>
                ) : items.length === 0 ? (
                  <div style={emptyStyle}>Todavia no hay novedades para mostrar.</div>
                ) : (
                  items.slice(0, 8).map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      style={notificationCardStyle}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <strong style={{ color: "var(--notification-text-strong, #fff)" }}>
                          {item.title}
                        </strong>
                        <span style={metaCopyStyle}>{item.body}</span>
                      </div>
                      <span style={metaStyle}>{formatNotificationDate(item.createdAt)}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={dropdownStyle}>
            <div style={dropdownHeaderStyle}>
              <div>
                <strong
                  style={{
                    display: "block",
                    color: "var(--notification-text-strong, #fff)",
                  }}
                >
                  {isAdmin ? "Alertas del operador" : "Novedades de tu cuenta"}
                </strong>
                <span style={metaStyle}>
                  {loading
                    ? "Actualizando..."
                    : unreadCount > 0
                      ? `${unreadCount} nueva${unreadCount === 1 ? "" : "s"}`
                      : "Todo al dia"}
                </span>
              </div>
            </div>

            <div className="theme-vertical-scroll" style={listStyle}>
              {loading ? (
                <div style={emptyStyle}>Cargando notificaciones...</div>
              ) : items.length === 0 ? (
                <div style={emptyStyle}>Todavia no hay novedades para mostrar.</div>
              ) : (
                items.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={notificationCardStyle}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ color: "var(--notification-text-strong, #fff)" }}>
                        {item.title}
                      </strong>
                      <span style={metaCopyStyle}>{item.body}</span>
                    </div>
                    <span style={metaStyle}>{formatNotificationDate(item.createdAt)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

export default function NotificationsMenu({
  mobileSheet = false,
}: {
  mobileSheet?: boolean;
}) {
  return <NotificationsMenuInner mobileSheet={mobileSheet} />;
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.42V11a6 6 0 1 0-12 0v3.18a2 2 0 0 1-.59 1.41L4 17h5" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function buildCustomerNotifications(orders: CustomerOrder[]): NotificationItem[] {
  return orders.flatMap((order) => {
    const createdNotification: NotificationItem = {
      id: `customer-order-created-${order.id}`,
      title: `Compra confirmada #${order.id}`,
      body: `Tu compra fue registrada correctamente por ${money(order.total)}.`,
      createdAt: order.createdAt,
      href: `/account/orders/${order.id}`,
    };

    const statusTime =
      order.shipment?.trackingEvents?.[0]?.createdAt ??
      ("updatedAt" in order && typeof order.updatedAt === "string" ? order.updatedAt : order.createdAt);

    const statusNotification =
      order.status !== "pending"
        ? {
            id: `customer-order-status-${order.id}-${order.status}`,
            title: getCustomerStatusTitle(order),
            body: getCustomerStatusBody(order),
            createdAt: statusTime,
            href: `/account/orders/${order.id}`,
          }
        : null;

    return statusNotification ? [statusNotification, createdNotification] : [createdNotification];
  });
}

function buildAdminOrderNotifications(orders: CustomerOrder[]): NotificationItem[] {
  return orders.map((order) => ({
    id: `admin-order-${order.id}`,
    title: `Nuevo pedido #${order.id}`,
    body: `${getOrderCustomer(order)} · ${money(order.total)} · ${orderStatusLabel(order.status)}`,
    createdAt: order.createdAt,
    href: "/account?section=admin-orders",
  }));
}

function buildAdminReturnNotifications(returns: ReturnNotificationEntry[]): NotificationItem[] {
  return returns.map((entry) => ({
    id: `admin-return-${entry.id}`,
    title: `Nueva devolucion #${entry.id}`,
    body: `Pedido #${entry.orderId} · Estado ${entry.status}`,
    createdAt: entry.createdAt,
    href: "/account?section=admin-returns",
  }));
}

function getCustomerStatusTitle(order: CustomerOrder) {
  if (order.status === "delivered") return `Pedido #${order.id} entregado`;
  if (order.status === "shipped") return `Pedido #${order.id} en camino`;
  if (order.status === "packed") return `Pedido #${order.id} listo para despacho`;
  if (order.status === "processing") return `Pedido #${order.id} en preparacion`;
  if (order.status === "paid") return `Pago confirmado para tu pedido #${order.id}`;
  return `Actualizacion de pedido #${order.id}`;
}

function getCustomerStatusBody(order: CustomerOrder) {
  if (order.status === "delivered") {
    return "Tu pedido figura como entregado. Si necesitas ayuda, podes revisar el detalle desde tu cuenta.";
  }

  if (order.status === "shipped") {
    return order.shipment?.trackingNumber
      ? `Ya fue despachado. Tracking: ${order.shipment.trackingNumber}.`
      : "Ya fue despachado y pronto vas a ver mas informacion del seguimiento.";
  }

  return `Estado actual: ${orderStatusLabel(order.status)}.`;
}

function getOrderCustomer(order: CustomerOrder) {
  const fullName = [
    order.customerFirstNameSnapshot ?? order.customer?.firstName,
    order.customerLastNameSnapshot ?? order.customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || order.customerEmailSnapshot || order.customer?.email || "Cliente sin identificar";
}

function compareNotifications(a: NotificationItem, b: NotificationItem) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const shellStyle: React.CSSProperties = {
  position: "relative",
};

const triggerStyle = (open: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: 46,
  height: 46,
  padding: 0,
  borderRadius: 999,
  border: open
    ? "1px solid var(--header-action-border-active, rgba(247,241,232,0.22))"
    : "1px solid var(--header-action-border, rgba(255,255,255,0.12))",
  background: open
    ? "var(--header-action-bg-active, rgba(255,255,255,0.08))"
    : "var(--header-action-bg, rgba(255,255,255,0.04))",
  color: "var(--header-action-color, #fff)",
  cursor: "pointer",
  position: "relative",
});

const badgeStyle: React.CSSProperties = {
  minWidth: 20,
  height: 20,
  padding: "0 5px",
  borderRadius: 999,
  background: "var(--header-action-badge-bg, #f7f1e8)",
  color: "var(--header-action-badge-color, #0b0b0b)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  position: "absolute",
  top: -4,
  right: -4,
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 12px)",
  right: 0,
  width: "min(92vw, 380px)",
  borderRadius: 24,
  border: "1px solid var(--notification-panel-border, rgba(255,255,255,0.08))",
  background: "var(--notification-panel-bg, rgba(10,10,10,0.96))",
  boxShadow: "var(--notification-panel-shadow, 0 24px 70px rgba(0,0,0,0.38))",
  overflow: "hidden",
  zIndex: 50,
};

const mobileSheetOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "var(--notification-overlay-bg, rgba(0,0,0,0.42))",
  zIndex: 35,
};

const mobilePopoverStyle: React.CSSProperties = {
  position: "fixed",
  top: 78,
  left: 14,
  right: 14,
  zIndex: 40,
  borderRadius: 28,
  border: "1px solid var(--notification-panel-border, rgba(255,255,255,0.08))",
  background: "var(--notification-panel-mobile-bg, linear-gradient(180deg, rgba(18,18,18,0.98), rgba(10,10,10,0.98)))",
  boxShadow: "var(--notification-panel-shadow, 0 26px 70px rgba(0,0,0,0.38))",
  overflow: "hidden",
  maxHeight: "min(72vh, 640px)",
  display: "grid",
};

const dropdownHeaderStyle: React.CSSProperties = {
  padding: 18,
  borderBottom: "1px solid var(--notification-header-border, rgba(255,255,255,0.08))",
  background: "var(--notification-header-bg, linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)))",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 14,
  maxHeight: 420,
  overflowY: "auto",
};

const notificationCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 18,
  border: "1px solid var(--notification-card-border, rgba(255,255,255,0.08))",
  background: "var(--notification-card-bg, rgba(255,255,255,0.03))",
  color: "var(--notification-text-strong, #f7f1e8)",
  textDecoration: "none",
};

const emptyStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px dashed var(--notification-empty-border, rgba(255,255,255,0.12))",
  background: "var(--notification-empty-bg, rgba(255,255,255,0.02))",
  padding: 18,
  color: "var(--notification-text-faint, rgba(247,241,232,0.66))",
  lineHeight: 1.6,
};

const metaStyle: React.CSSProperties = {
  color: "var(--notification-text-muted, rgba(247,241,232,0.54))",
  fontSize: 12,
};

const metaCopyStyle: React.CSSProperties = {
  color: "var(--notification-text-soft, rgba(247,241,232,0.7))",
  lineHeight: 1.5,
  fontSize: 13,
};
