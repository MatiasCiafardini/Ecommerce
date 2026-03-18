"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export default function StoreShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <div>
      {/* HEADER */}
      <header
        style={{
          padding: "20px",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Link href="/">Mi tienda</Link>

        <div style={{ display: "flex", gap: 15 }}>
          <Link href="/account">Cuenta</Link>

          {user ? (
            <>
              <span>{user.email}</span>
              <button onClick={logout}>Salir</button>
            </>
          ) : (
            <Link href="/login">Ingresar</Link>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
