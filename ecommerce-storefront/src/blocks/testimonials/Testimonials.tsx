export default function Testimonials() {
  const reviews = [
    { name: "Ana", text: "Excelente tienda!" },
    { name: "Juan", text: "Muy buenos productos." },
    { name: "Lucía", text: "Gran experiencia de compra." },
  ];

  return (
    <section style={{ padding: "60px" }}>
      <h2>Testimonios</h2>

      {reviews.map((r) => (
        <blockquote key={r.name}>
          <p>"{r.text}"</p>
          <small>- {r.name}</small>
        </blockquote>
      ))}
    </section>
  );
}
