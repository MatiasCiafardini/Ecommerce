type Props = {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
};

export default function Banner({
  text = "Envíos gratis en compras mayores a $50",
  backgroundColor = "black",
  textColor = "white",
}: Props) {
  return (
    <section
      style={{
        background: backgroundColor,
        color: textColor,
        padding: "60px",
        textAlign: "center",
      }}
    >
      <h2>{text}</h2>
    </section>
  );
}
