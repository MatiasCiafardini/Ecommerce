export default function StoreShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 28%), var(--background)",
      }}
    >
      <main>{children}</main>
    </div>
  );
}
