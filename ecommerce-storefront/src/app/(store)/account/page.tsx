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
  "admin-products",
  "admin-categories",
  "admin-promotions",
  "admin-settings",
  "admin-orders",
  "admin-customers",
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

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    const isAdmin = user?.role && user.role !== "CUSTOMER";
    const manualSalesEnabled = Boolean(user?.storeFeatures?.manualSalesEnabled);

    if (requestedSection === "admin-manual-sales" && isAdmin && manualSalesEnabled) {
      router.replace("/manual-sales");
    }
  }, [loading, router, searchParams, user]);

  const section = useMemo<AccountSection>(() => {
    const requestedSection = searchParams.get("section") as AccountSection | null;
    const isAdmin = user?.role && user.role !== "CUSTOMER";
    const enabledAdminSections = adminSections;
    const allowedSections = isAdmin
      ? [...customerSections, ...enabledAdminSections]
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
