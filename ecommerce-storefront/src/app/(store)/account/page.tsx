"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import AccountWorkspace, {
  type AccountSection,
} from "@/components/account/AccountWorkspace";

const customerSections: AccountSection[] = ["orders", "profile", "addresses", "payments"];
const adminSections: AccountSection[] = [
  "admin-overview",
  "admin-accounting",
  "admin-developer",
  "admin-manual-sales",
  "admin-products",
  "admin-stock",
  "admin-labels",
  "admin-categories",
  "admin-promotions",
  "admin-settings",
  "admin-orders",
  "admin-customers",
  "admin-current-accounts",
  "admin-shipments",
  "admin-returns",
];
export default function AccountPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando cuenta..." />}>
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [user, loading, router]);

  const section = useMemo<AccountSection>(() => {
    const requestedSection = searchParams.get("section") as AccountSection | null;
    const isAdmin = ["SUPER_ADMIN", "OWNER", "ADMIN", "STAFF"].includes(user?.role ?? "");
    const allowedSections = isAdmin
      ? [...customerSections, ...adminSections]
      : customerSections;

    if (requestedSection && allowedSections.includes(requestedSection)) {
      return requestedSection;
    }

    return isAdmin ? "admin-overview" : "orders";
  }, [searchParams, user]);

  if (loading || !user) {
    return <LoadingState label="Cargando cuenta..." />;
  }

  return (
    <AccountWorkspace
      user={user}
      section={section}
      onSectionChange={(nextSection) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("section", nextSection);
        if (nextSection !== "admin-labels") {
          params.delete("productId");
          params.delete("variantIds");
        }
        if (nextSection === "admin-orders") {
          params.delete("orderId");
        }
        router.replace(`/account?${params.toString()}`);
      }}
    />
  );
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
