"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import AccountWorkspace, {
  type AccountSection,
} from "@/components/account/AccountWorkspace";

const customerSections: AccountSection[] = ["orders", "profile", "addresses", "payments"];
const adminSections: AccountSection[] = [
  "admin-overview",
  "admin-products",
  "admin-categories",
  "admin-orders",
  "admin-customers",
];

export default function AccountPage() {
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
    const isAdmin = user?.role && user.role !== "CUSTOMER";
    const allowedSections = isAdmin
      ? [...customerSections, ...adminSections]
      : customerSections;

    if (requestedSection && allowedSections.includes(requestedSection)) {
      return requestedSection;
    }

    return isAdmin ? "admin-overview" : "orders";
  }, [searchParams, user]);

  if (loading || !user) {
    return (
      <section style={{ padding: "72px 24px", minHeight: "calc(100vh - 180px)" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 32,
            color: "rgba(247,241,232,0.7)",
          }}
        >
          Cargando cuenta...
        </div>
      </section>
    );
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
