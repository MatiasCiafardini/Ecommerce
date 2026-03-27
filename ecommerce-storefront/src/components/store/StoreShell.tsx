export default function StoreShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-store-shell style={{ minHeight: "100vh" }}>
      <main data-store-content>{children}</main>
    </div>
  );
}
