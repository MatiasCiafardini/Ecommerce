type Props = {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
};

export default function Banner({
  text = "Envios gratis en compras desde $120.000",
  backgroundColor,
  textColor,
}: Props) {
  const resolvedBackground =
    backgroundColor ??
    "color-mix(in srgb, var(--paper) 78%, var(--surface))";
  const resolvedTextColor = textColor ?? "var(--text-strong)";

  return (
    <section
      style={{
        background: `linear-gradient(90deg, ${resolvedBackground} 0%, color-mix(in srgb, ${resolvedBackground} 72%, var(--paper-muted)) 100%)`,
        color: resolvedTextColor,
        padding: "18px 20px",
        textAlign: "center",
        borderTop: "1px solid var(--border-soft)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: resolvedTextColor,
        }}
      >
        {text}
      </h2>
    </section>
  );
}
