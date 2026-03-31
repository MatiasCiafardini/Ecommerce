"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

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
  }, [user]);

  useEffect(() => {
    if (!user || !open) {
      return;
    }

    let active = true;
    const storageKey = readStorageKey(user.id, user.role);

    const loadNotifications = async () => {
      try {
        setLoading(true);

        const response = await api(
          isAdmin ? "/orders/notifications" : "/customers/me/orders/notifications",
        );

        if (!active) {
          return;
        }

        setItems(Array.isArray(response?.items) ? (response.items as NotificationItem[]) : []);
        const now = new Date().toISOString();
        localStorage.setItem(storageKey, now);
        setLastSeenAt(now);
      } catch {
        if (active) {
          setItems([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [isAdmin, open, user]);

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
                  <div style={emptyStyle}>Todavía no hay novedades para mostrar.</div>
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
                <div style={emptyStyle}>Todavía no hay novedades para mostrar.</div>
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
  color: "var(--header-action-badge-color, #111)",
  fontSize: 11,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "absolute",
  top: -5,
  right: -5,
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 14px)",
  right: 0,
  width: "min(92vw, 360px)",
  maxHeight: "min(70vh, 560px)",
  overflow: "hidden",
  borderRadius: 26,
  border: "1px solid var(--notification-panel-border, rgba(255,255,255,0.08))",
  background: "var(--notification-panel-bg, rgba(10,10,10,0.96))",
  boxShadow: "var(--notification-panel-shadow, 0 24px 70px rgba(0,0,0,0.38))",
  backdropFilter: "blur(20px)",
  zIndex: 70,
};

const mobileSheetOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 79,
  background: "var(--notification-overlay-bg, rgba(0,0,0,0.42))",
  backdropFilter: "blur(8px)",
};

const mobilePopoverStyle: React.CSSProperties = {
  position: "fixed",
  left: 12,
  right: 12,
  bottom: 12,
  width: "auto",
  maxHeight: "min(78vh, 640px)",
  overflow: "hidden",
  borderRadius: 28,
  border: "1px solid var(--notification-panel-border, rgba(255,255,255,0.08))",
  background:
    "var(--notification-panel-mobile-bg, linear-gradient(180deg, rgba(18,18,18,0.98), rgba(10,10,10,0.98)))",
  boxShadow: "var(--notification-panel-shadow, 0 26px 70px rgba(0,0,0,0.38))",
  backdropFilter: "blur(22px)",
  zIndex: 80,
};

const dropdownHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "18px 20px 16px",
  borderBottom: "1px solid var(--notification-header-border, rgba(255,255,255,0.08))",
  background:
    "var(--notification-header-bg, linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)))",
};

const listStyle: React.CSSProperties = {
  maxHeight: "min(58vh, 460px)",
  overflowY: "auto",
  padding: 16,
  display: "grid",
  gap: 12,
};

const notificationCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  textDecoration: "none",
  padding: 14,
  borderRadius: 20,
  border: "1px solid var(--notification-card-border, rgba(255,255,255,0.08))",
  background: "var(--notification-card-bg, rgba(255,255,255,0.03))",
  color: "var(--notification-text-strong, #f7f1e8)",
};

const emptyStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: 18,
  textAlign: "center",
  border: "1px dashed var(--notification-empty-border, rgba(255,255,255,0.12))",
  background: "var(--notification-empty-bg, rgba(255,255,255,0.02))",
  color: "var(--notification-text-faint, rgba(247,241,232,0.66))",
};

const metaStyle: React.CSSProperties = {
  color: "var(--notification-text-muted, rgba(247,241,232,0.54))",
  fontSize: 12,
};

const metaCopyStyle: React.CSSProperties = {
  color: "var(--notification-text-soft, rgba(247,241,232,0.7))",
  fontSize: 13,
  lineHeight: 1.6,
};
