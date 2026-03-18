type Props = {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
};

export default function Banner({
  text = "Envios gratis en compras desde $120.000",
  backgroundColor = "#101010",
  textColor = "#f4f0ea",
}: Props) {
  const isLight = backgroundColor.toLowerCase() !== "#101010";

  return (
    <section
      style={{
        background: isLight
          ? `linear-gradient(90deg, ${backgroundColor} 0%, #d6cfc4 100%)`
          : `linear-gradient(90deg, ${backgroundColor} 0%, #1d1d1d 100%)`,
        color: textColor,
        padding: "18px 20px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: textColor,
        }}
      >
        {text}
      </h2>
    </section>
  );
}
