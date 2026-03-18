export default function Newsletter() {
  return (
    <section
      style={{
        padding: "80px",
        textAlign: "center",
      }}
    >
      <h2>Suscribite a nuestro newsletter</h2>

      <div style={{ marginTop: "20px" }}>
        <input
          placeholder="Tu email"
          style={{
            padding: "10px",
            marginRight: "10px",
          }}
        />

        <button>Suscribirme</button>
      </div>
    </section>
  );
}
