"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import ManualSalesWorkspace from "@/components/manual-sales/ManualSalesWorkspace";

export default function ManualSalesPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando venta manual..." />}>
      <ManualSalesPageInner />
    </Suspense>
  );
}

function ManualSalesPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login?redirect=/manual-sales");
      return;
    }

    const isAdmin = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role ?? "");
    const manualSalesEnabled = isManualSalesEnabledForUser(user);

    if (!isAdmin || !manualSalesEnabled) {
      router.replace("/account");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return <LoadingState label="Cargando venta manual..." />;
  }

  const isAdmin = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user.role ?? "");
  const manualSalesEnabled = isManualSalesEnabledForUser(user);

  if (!isAdmin || !manualSalesEnabled) {
    return <LoadingState label="Redirigiendo..." />;
  }

  return <ManualSalesWorkspace />;
}

function isManualSalesEnabledForUser(user: {
  storeId?: number;
  storeFeatures?: { manualSalesEnabled?: boolean };
}) {
  return Boolean(user.storeFeatures?.manualSalesEnabled || user.storeId === 3);
}

function LoadingState({ label }: { label: string }) {
  return (
    <section style={{ padding: "72px 24px", minHeight: "calc(100vh - 180px)" }}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          borderRadius: 32,
          border: "1px solid var(--border-soft)",
          background: "var(--page-panel-bg)",
          padding: 32,
          color: "var(--text-muted)",
        }}
      >
        {label}
      </div>
    </section>
  );
}
