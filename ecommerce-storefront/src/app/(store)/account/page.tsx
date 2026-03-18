"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import ProfileSection from "@/components/account/ProfileSection";
import AddressSection from "@/components/account/AddressSection";
import PaymentSection from "@/components/account/PaymentSection";
import OrdersSection from "@/components/account/OrdersSection";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [user, loading, router]);

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

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return (
    <section
      style={{
        padding: "72px 20px 96px",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), #0b0b0b",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 12,
              color: "rgba(247,241,232,0.56)",
            }}
          >
            Mi perfil
          </p>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.8rem)",
              lineHeight: 0.95,
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "-0.06em",
            }}
          >
            Cuenta
          </h1>
        </div>

        <div
          className="layout-two-col"
          style={{
            gap: 24,
            alignItems: "start",
          }}
        >
          <aside
            className="layout-sidebar"
            style={{
              padding: 28,
              borderRadius: 32,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              display: "grid",
              gap: 18,
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 14px",
                  color: "rgba(247,241,232,0.56)",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: 12,
                }}
              >
                Cliente
              </p>
              <h2 style={{ margin: "0 0 8px", fontSize: 28 }}>
                {displayName || user.email}
              </h2>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "rgba(247,241,232,0.84)",
                  fontSize: 14,
                }}
              >
                {user.email}
              </p>
              <p style={{ margin: 0, color: "rgba(247,241,232,0.68)", lineHeight: 1.7 }}>
                Gestiona tus datos, direcciones y preferencias antes del proximo
                checkout.
              </p>
            </div>

            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                padding: 20,
                display: "grid",
                gap: 10,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(247,241,232,0.48)",
                }}
              >
                Resumen rapido
              </p>
              <strong style={{ fontSize: 20 }}>Todo en un solo lugar</strong>
              <p style={{ margin: 0, color: "rgba(247,241,232,0.66)", lineHeight: 1.7 }}>
                Compras, datos y direcciones viven en el mismo panel para que tu
                proximo checkout sea mas rapido y claro.
              </p>
            </div>

            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(8,8,8,0.5)",
                padding: 20,
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(247,241,232,0.48)",
                }}
              >
                Estado de cuenta
              </p>
              <strong style={{ display: "block", fontSize: 22 }}>Perfil activo</strong>
              <p style={{ margin: "10px 0 0", color: "rgba(247,241,232,0.66)", lineHeight: 1.7 }}>
                Desde aca podes actualizar datos, manejar direcciones y dejar tu
                checkout listo para el proximo drop.
              </p>
            </div>
          </aside>

          <div style={{ display: "grid", gap: 24 }}>
            <OrdersSection />
            <ProfileSection user={user} />
            <AddressSection user={user} />
            <PaymentSection />
          </div>
        </div>
      </div>
    </section>
  );
}
