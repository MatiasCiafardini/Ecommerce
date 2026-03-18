export default function Header() {
  return (
    <header
      style={{
        padding: "20px",
        borderBottom: "1px solid #eee",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <strong>Tienda</strong>

      <nav style={{ display: "flex", gap: "20px" }}>
        <a href="/">Inicio</a>
        <a href="/category">Categorías</a>
        <a href="/cart">Carrito</a>
      </nav>
    </header>
  );
}
