"use client";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Store route error", error);

  return (
    <div
      data-store-content
      style={{
        minHeight: "50vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "min(100%, 640px)",
          display: "grid",
          gap: 14,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border-soft)",
          background: "var(--page-panel-bg)",
        }}
      >
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          Storefront
        </p>
        <h2 style={{ margin: 0, color: "var(--text-strong)" }}>
          No pudimos cargar esta pagina
        </h2>
        <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Recarga la vista o reintenta en unos segundos.
        </p>
        <div>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid var(--border-soft)",
              background: "var(--paper)",
              color: "#111",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Reintentar
          </button>
        </div>
      </section>
    </div>
  );
}
