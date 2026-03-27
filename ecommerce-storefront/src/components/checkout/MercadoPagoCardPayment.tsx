"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => {
      bricks: () => {
        create: (
          brickType: string,
          containerId: string,
          settings: Record<string, unknown>,
        ) => Promise<{
          unmount?: () => void;
          destroy?: () => void;
        }>;
      };
    };
  }
}

type MercadoPagoCardPayload = {
  token: string;
  paymentMethodId?: string;
  issuerId?: string;
  installments?: number;
};

const MERCADOPAGO_SCRIPT_URL = "https://sdk.mercadopago.com/js/v2";

const sdkMessageStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(247,241,232,0.68)",
  lineHeight: 1.7,
};

export default function MercadoPagoCardPayment({
  amount,
  payerEmail,
  disabled = false,
  onSubmit,
  onProcessingChange,
  onError,
}: {
  amount: number;
  payerEmail?: string | null;
  disabled?: boolean;
  onSubmit: (payload: MercadoPagoCardPayload) => Promise<void>;
  onProcessingChange?: (processing: boolean) => void;
  onError?: (message: string) => void;
}) {
  const containerId = useId().replace(/:/g, "-");
  const [sdkReady, setSdkReady] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [componentError, setComponentError] = useState<string | null>(null);
  const controllerRef = useRef<{ unmount?: () => void; destroy?: () => void } | null>(null);
  const submitRef = useRef(onSubmit);
  const errorRef = useRef(onError);
  const processingRef = useRef(onProcessingChange);

  submitRef.current = onSubmit;
  errorRef.current = onError;
  processingRef.current = onProcessingChange;

  useEffect(() => {
    let active = true;

    const loadConfig = async () => {
      try {
        const config = await api("/store/payment-config");
        const nextPublicKey = String(config?.mercadopago?.publicKey ?? "").trim();

        if (!active) {
          return;
        }

        if (!nextPublicKey) {
          setPublicKey("");
          setComponentError(
            "Mercado Pago no esta configurado para esta tienda todavia.",
          );
          return;
        }

        setPublicKey(nextPublicKey);
        setComponentError(null);
      } catch (error) {
        if (!active) {
          return;
        }

        setPublicKey("");
        setComponentError(
          error instanceof Error
            ? error.message
            : "No pudimos cargar la configuracion de Mercado Pago.",
        );
      }
    };

    void loadConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    if (window.MercadoPago) {
      setSdkReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${MERCADOPAGO_SCRIPT_URL}"]`,
    );

    if (existingScript) {
      const handleLoad = () => setSdkReady(true);
      existingScript.addEventListener("load", handleLoad);

      if (existingScript.dataset.loaded === "true") {
        setSdkReady(true);
      }

      return () => existingScript.removeEventListener("load", handleLoad);
    }

    const script = document.createElement("script");
    script.src = MERCADOPAGO_SCRIPT_URL;
    script.async = true;
    script.dataset.loaded = "false";
    script.onload = () => {
      script.dataset.loaded = "true";
      setSdkReady(true);
    };
    script.onerror = () => {
      setComponentError(
        "No pudimos cargar Mercado Pago en este momento. Intenta nuevamente en unos instantes.",
      );
    };

    document.body.appendChild(script);
  }, [publicKey]);

  useEffect(() => {
    if (!sdkReady || !window.MercadoPago || !publicKey) {
      return;
    }

    let active = true;

    const mountBrick = async () => {
      try {
        controllerRef.current?.unmount?.();
        controllerRef.current?.destroy?.();

        const MercadoPagoSdk = window.MercadoPago;

        if (!MercadoPagoSdk) {
          throw new Error("Mercado Pago todavia no termino de cargar.");
        }

        const mercadoPago = new MercadoPagoSdk(publicKey, {
          locale: "es-AR",
        });

        const bricks = mercadoPago.bricks();
        const controller = await bricks.create("cardPayment", containerId, {
          initialization: {
            amount,
            payer: {
              email: payerEmail ?? undefined,
            },
          },
          customization: {
            visual: {
              style: {
                theme: "dark",
              },
            },
            paymentMethods: {
              maxInstallments: 6,
            },
          },
          callbacks: {
            onReady: () => {
              if (!active) return;
              setComponentError(null);
            },
            onSubmit: async (cardFormData: Record<string, unknown>) => {
              if (disabled) {
                return;
              }

              const token = String(cardFormData.token ?? "").trim();

              if (!token) {
                const message = "Mercado Pago no devolvio un token de tarjeta valido.";
                setComponentError(message);
                errorRef.current?.(message);
                return;
              }

              processingRef.current?.(true);

              try {
                await submitRef.current({
                  token,
                  paymentMethodId:
                    String(
                      cardFormData.payment_method_id ??
                        cardFormData.paymentMethodId ??
                        "",
                    ).trim() || undefined,
                  issuerId:
                    String(cardFormData.issuer_id ?? cardFormData.issuerId ?? "").trim() ||
                    undefined,
                  installments: Number(cardFormData.installments ?? 1) || 1,
                });
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "No pudimos procesar el pago con Mercado Pago.";

                setComponentError(message);
                errorRef.current?.(message);
                throw error;
              } finally {
                processingRef.current?.(false);
              }
            },
            onError: (error: { message?: string }) => {
              const message =
                error?.message?.trim() ||
                "No pudimos inicializar el formulario de Mercado Pago.";

              if (!active) return;

              setComponentError(message);
              errorRef.current?.(message);
            },
          },
        });

        if (!active) {
          controller.unmount?.();
          controller.destroy?.();
          return;
        }

        controllerRef.current = controller;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No pudimos preparar Mercado Pago para esta compra.";

        if (!active) return;

        setComponentError(message);
        errorRef.current?.(message);
      }
    };

    mountBrick();

    return () => {
      active = false;
      controllerRef.current?.unmount?.();
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
    };
  }, [amount, containerId, disabled, payerEmail, publicKey, sdkReady]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <strong style={{ fontSize: 18 }}>Tarjeta con Mercado Pago</strong>
        <p style={sdkMessageStyle}>
          Completa los datos de tu tarjeta para confirmar la compra al instante.
        </p>
      </div>

      {componentError ? (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,159,159,0.24)",
            background: "rgba(120,18,18,0.18)",
            padding: 16,
            display: "grid",
            gap: 8,
          }}
        >
          <strong style={{ color: "#fff" }}>Mercado Pago no esta listo</strong>
          <p style={sdkMessageStyle}>{componentError}</p>
        </div>
      ) : null}

      <div
        id={containerId}
        style={{
          minHeight: 560,
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
      />
    </div>
  );
}
