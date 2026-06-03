import { copyStyle, eyebrowStyle, metaStyle, stateStyle, title2Style } from "./admin-styles";

export function AdminHeader({ title, copy }: { title: string; copy?: string }) {
  return (
    <div>
      <p style={eyebrowStyle}>Gestion</p>
      <h2 style={title2Style}>{title}</h2>
      {copy ? <p style={copyStyle}>{copy}</p> : null}
    </div>
  );
}

export function AdminStateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

export function AdminMetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article
      style={{
        borderRadius: 18,
        border: "1px solid var(--account-item-border)",
        background: "var(--account-item-bg)",
        padding: 16,
        display: "grid",
        gap: 8,
      }}
    >
      <span style={metaStyle}>{label}</span>
      <strong style={{ color: "var(--account-text-strong)", fontSize: 26 }}>{value}</strong>
    </article>
  );
}
