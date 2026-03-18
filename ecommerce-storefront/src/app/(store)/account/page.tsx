"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import ProfileSection from "@/components/account/ProfileSection";
import AddressSection from "@/components/account/AddressSection";
import PaymentSection from "@/components/account/PaymentSection";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [user, loading]);

  if (loading || !user) return <p>Cargando...</p>;

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1>Mi cuenta</h1>

      <ProfileSection user={user} />
      <AddressSection />
      <PaymentSection />
    </div>
  );
}
