import type React from "react";

export {
  errorStyle,
  eyebrowStyle,
  ghostButtonStyle,
  metaStyle,
  newOrderBadgeStyle,
  panelStyle,
  softChipStyle,
  statusChipStyle,
  title3Style,
} from "../admin/shared/admin-styles";

export const orderQueueStatsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

export const orderQueueShellStyle: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid var(--account-item-border)",
  background: "var(--page-panel-bg)",
  padding: 18,
  display: "grid",
  gap: 16,
  minWidth: 0,
};

export const orderToolbarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 0.7fr) minmax(260px, 1fr)",
  gap: 16,
  alignItems: "end",
};

export const orderSearchInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 16,
  border: "1px solid var(--account-item-border)",
  background: "var(--muted-field-bg)",
  color: "var(--account-text-strong)",
  padding: "12px 14px",
  outline: "none",
  boxSizing: "border-box",
};

export const orderFilterRailStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  overflowX: "auto",
  paddingBottom: 4,
};

export const orderFilterCountStyle = (active: boolean): React.CSSProperties => ({
  minWidth: 24,
  minHeight: 24,
  borderRadius: 999,
  display: "inline-grid",
  placeItems: "center",
  padding: "0 7px",
  background: active ? "var(--accent-contrast)" : "var(--account-item-bg)",
  color: active ? "var(--accent-strong)" : "var(--account-text-muted)",
  fontSize: 12,
});

export const orderFilterButtonStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  flex: "0 0 auto",
  borderRadius: 999,
  border: active ? "1px solid var(--checkout-border-strong)" : "1px solid var(--account-item-border)",
  background: active ? "var(--accent-strong)" : "var(--account-item-bg)",
  color: active ? "var(--accent-contrast)" : "var(--account-text-strong)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
});

export const orderTableScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  paddingBottom: 4,
};

export const orderTableStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 1080,
};

export const orderRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "96px minmax(190px, 1.2fr) minmax(140px, 0.8fr) minmax(150px, 0.9fr) minmax(170px, 1fr) minmax(120px, 0.6fr) 170px",
  gap: 12,
  alignItems: "center",
};

export const orderHeaderRowStyle: React.CSSProperties = {
  color: "var(--account-text-soft)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  padding: "0 14px 6px",
};

export const orderCellStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 0,
  alignContent: "center",
};

export const orderActionCellStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  justifyItems: "stretch",
};

export const orderPrimaryActionStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 999,
  background: "var(--accent-strong)",
  color: "var(--accent-contrast)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 700,
};

export const orderIssueListStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

export const orderIssueChipStyle: React.CSSProperties = {
  display: "inline-flex",
  borderRadius: 999,
  border: "1px solid var(--admin-tone-warning-border)",
  background: "var(--admin-tone-warning-bg)",
  color: "var(--admin-tone-warning-color)",
  padding: "5px 8px",
  fontSize: 11,
  lineHeight: 1.2,
};

export const orderRowItemStyle = (selected: boolean): React.CSSProperties => ({
  ...orderRowStyle,
  borderRadius: 18,
  border: selected ? "1px solid var(--account-item-border-active)" : "1px solid var(--account-item-border)",
  background: selected ? "var(--account-item-bg-active)" : "var(--account-item-bg)",
  padding: 14,
  cursor: "pointer",
  boxShadow: selected ? "0 18px 44px rgba(0,0,0,0.08)" : "none",
});
