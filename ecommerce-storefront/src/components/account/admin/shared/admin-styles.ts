import type React from "react";

export const panelStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

export const title2Style: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(1.8rem,2vw,2.6rem)",
  letterSpacing: "-0.05em",
};

export const title3Style: React.CSSProperties = {
  margin: "8px 0 0",
  color: "var(--account-text-strong)",
  fontSize: 22,
};

export const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};

export const metaStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 13,
  lineHeight: 1.4,
};

export const copyStyle: React.CSSProperties = {
  color: "var(--account-text-muted)",
  lineHeight: 1.6,
};

export const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--admin-danger-color)",
};

export const ghostButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  background: "var(--account-item-bg)",
  color: "var(--account-text-strong)",
  border: "1px solid var(--account-item-border)",
  borderRadius: 999,
  cursor: "pointer",
};

export const stateStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--account-item-bg)",
  padding: 24,
  color: "var(--account-text-muted)",
};

export const newOrderBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border, var(--checkout-border-strong))",
  background: "var(--notification-badge-bg, #ff3b30)",
  color: "var(--notification-badge-color, #fff)",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};

export const softChipStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid var(--checkout-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-muted)",
  fontSize: 12,
};

export const statusChipStyle = (status: string): React.CSSProperties => ({
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  border:
    status === "cancelled"
      ? "1px solid var(--admin-danger-border)"
      : status === "delivered" || status === "picked_up"
        ? "1px solid var(--admin-tone-success-border)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "1px solid var(--admin-tone-info-border)"
          : "1px solid var(--admin-status-idle-border)",
  background:
    status === "cancelled"
      ? "var(--admin-danger-bg)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-bg)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "var(--admin-tone-info-bg)"
          : "var(--admin-status-idle-bg)",
  color:
    status === "cancelled"
      ? "var(--admin-danger-color)"
      : status === "delivered" || status === "picked_up"
        ? "var(--admin-tone-success-color)"
        : status === "shipped" || status === "ready_for_pickup"
          ? "var(--admin-tone-info-color)"
          : "var(--admin-status-idle-color)",
  fontSize: 12,
});
