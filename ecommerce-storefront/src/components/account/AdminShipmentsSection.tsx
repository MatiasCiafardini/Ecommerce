"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { api } from "@/lib/api";
import AdminShippingMethodsCard from "./AdminShippingMethodsCard";
import type { AdminStoreShippingMethod } from "./admin-types";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const trojaniDefaultShippingMethods = [
  {
    name: "Correo Argentino Clasico - Domicilio",
    type: "free",
    price: 0,
    description: "Envio gratis",
    active: true,
    displayOrder: 0,
  },
  {
    name: "Correo Argentino Expreso - Domicilio",
    type: "free",
    price: 0,
    description: "Envio gratis",
    active: true,
    displayOrder: 1,
  },
  {
    name: "Retiro en local",
    type: "pickup",
    price: 0,
    description: "Envio gratis",
    active: true,
    displayOrder: 2,
  },
] as const;

export default function AdminShipmentsSection() {
  const seedAttemptedRef = useRef(false);
  const [shippingMethods, setShippingMethods] = useState<AdminStoreShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadShippingMethods = async () => {
    try {
      setLoading(true);
      const methodsData = await api("/admin/shipping/methods?includeArchived=true");
      const allMethods = Array.isArray(methodsData)
        ? (methodsData as AdminStoreShippingMethod[])
        : [];

      if (
        allMethods.length === 0 &&
        !seedAttemptedRef.current &&
        isTrojaniTheme()
      ) {
        seedAttemptedRef.current = true;
        await seedTrojaniShippingMethods();
        const seededMethodsData = await api("/admin/shipping/methods");
        setShippingMethods(
          Array.isArray(seededMethodsData)
            ? (seededMethodsData as AdminStoreShippingMethod[])
            : [],
        );
        setSuccess("Cargamos los metodos actuales de Trojani para que puedas editarlos.");
        setError("");
        return;
      }

      setShippingMethods(allMethods.filter((method) => !method.deletedAt));
      setError("");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "No se pudieron cargar los metodos de envio."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShippingMethods();
  }, []);

  return (
    <section style={panelStyle}>
      <Header
        title="Envios"
        copy="Configura las opciones que aparecen en checkout para que el cliente elija como recibir su pedido."
      />

      {error ? <p style={errorStyle}>{error}</p> : null}
      {success ? <p style={successStyle}>{success}</p> : null}

      {loading ? (
        <StateCard label="Cargando metodos de envio..." />
      ) : (
        <AdminShippingMethodsCard
          shippingMethods={shippingMethods}
          onUpdated={loadShippingMethods}
          onError={(message) => {
            setError(message);
            setSuccess("");
          }}
          onSuccess={(message) => {
            setSuccess(message);
            setError("");
          }}
        />
      )}
    </section>
  );
}

async function seedTrojaniShippingMethods() {
  for (const method of trojaniDefaultShippingMethods) {
    await api("/admin/shipping/methods", {
      method: "POST",
      body: JSON.stringify(method),
    });
  }
}

function isTrojaniTheme() {
  if (typeof document === "undefined") return false;
  const className = `${document.documentElement.className} ${document.body.className}`;
  return className.includes("theme-trojani");
}

function Header({ title, copy }: { title: string; copy?: string }) {
  return (
    <div style={headerStyle}>
      <div>
        <p style={eyebrowStyle}>Checkout</p>
        <h2 style={title2Style}>{title}</h2>
      </div>
      {copy ? <p style={copyStyle}>{copy}</p> : null}
    </div>
  );
}

function StateCard({ label }: { label: string }) {
  return <div style={stateStyle}>{label}</div>;
}

const panelStyle: CSSProperties = {
  display: "grid",
  gap: 24,
  width: "100%",
  maxWidth: 760,
  minWidth: 0,
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  maxWidth: 680,
};

const stateStyle: CSSProperties = {
  borderRadius: 20,
  border: "1px solid var(--checkout-border-strong)",
  background: "var(--page-panel-strong-bg)",
  padding: 18,
  color: "var(--account-text-muted)",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  fontSize: 12,
  color: "var(--account-text-soft)",
};

const title2Style: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "clamp(1.8rem,2vw,2.6rem)",
  letterSpacing: "-0.05em",
};

const copyStyle: CSSProperties = {
  margin: 0,
  color: "var(--account-text-muted)",
  lineHeight: 1.7,
};

const errorStyle: CSSProperties = { margin: 0, color: "#ff9f9f" };
const successStyle: CSSProperties = { margin: 0, color: "#b8f5c2" };
