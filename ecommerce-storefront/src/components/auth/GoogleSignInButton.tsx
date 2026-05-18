"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { User } from "@/context/auth-context";
import { getGoogleClientId } from "@/lib/runtime-config";
import { getClientStoreId } from "@/lib/tenant/store-context";

type GoogleCredentialResponse = {
  credential?: string;
  clientId?: string;
};

type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";

type Props = {
  text?: GoogleButtonText;
  disabled?: boolean;
  onSuccess: (user: User) => void | Promise<void>;
  onError?: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
  loginWithGoogle: (data: { credential: string; clientId?: string }) => Promise<User>;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: GoogleButtonText;
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

      const finishIfReady = () => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }

        reject(new Error("No se pudo cargar Google Sign-In."));
      };

      if (existingScript) {
        existingScript.addEventListener("load", finishIfReady, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("No se pudo cargar Google Sign-In.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = finishIfReady;
      script.onerror = () => reject(new Error("No se pudo cargar Google Sign-In."));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

export function GoogleSignInButton({
  text = "continue_with",
  disabled = false,
  onSuccess,
  onError,
  onBusyChange,
  loginWithGoogle,
}: Props) {
  const clientId = getGoogleClientId();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAvailableForStore, setIsAvailableForStore] = useState(false);
  const emitSuccess = useEffectEvent(async (user: User) => {
    await onSuccess(user);
  });
  const emitError = useEffectEvent((message: string) => {
    onError?.(message);
  });
  const emitBusyChange = useEffectEvent((busy: boolean) => {
    onBusyChange?.(busy);
  });
  const performGoogleLogin = useEffectEvent(
    async (data: { credential: string; clientId?: string }) => loginWithGoogle(data),
  );

  useEffect(() => {
    try {
      setIsAvailableForStore(getClientStoreId() !== 7);
    } catch {
      setIsAvailableForStore(false);
    }
  }, []);

  useEffect(() => {
    if (!clientId || !isAvailableForStore || !buttonRef.current) {
      return;
    }

    let active = true;

    void loadGoogleScript()
      .then(() => {
        if (!active || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        setLoadError(null);

        const handleCredential = async (response: GoogleCredentialResponse) => {
          if (!response.credential) {
            emitError("Google no devolvio una credencial valida.");
            return;
          }

          try {
            emitBusyChange(true);
            const user = await performGoogleLogin({
              credential: response.credential,
              clientId,
            });
            await emitSuccess(user);
          } catch (error) {
            const message =
              error instanceof Error && error.message
                ? error.message
                : "No se pudo iniciar con Google.";
            emitError(message);
          } finally {
            emitBusyChange(false);
          }
        };

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
        });

        buttonRef.current.innerHTML = "";
        const buttonWidth = Math.min(
          buttonRef.current.parentElement?.clientWidth || 360,
          360,
        );
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width: buttonWidth,
          locale: "es",
        });

        setReady(true);
      })
      .catch((error) => {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No se pudo cargar Google Sign-In.";
        setLoadError(message);
        emitError(message);
      });

    return () => {
      active = false;
    };
  }, [clientId, isAvailableForStore, text]);

  if (!isAvailableForStore) {
    return null;
  }

  if (!clientId) {
    return (
      <FallbackMessage message="Google Sign-In no está configurado en este frontend." />
    );
  }

  if (loadError) {
    return <FallbackMessage message={loadError} />;
  }

  return (
    <div
      aria-disabled={disabled}
      style={{
        width: "100%",
        opacity: disabled ? 0.65 : 1,
        pointerEvents: disabled || !ready ? "none" : "auto",
      }}
    >
      <div
        ref={buttonRef}
        style={{
          width: "100%",
          minHeight: 44,
          display: "flex",
          justifyContent: "center",
        }}
      />
    </div>
  );
}

function FallbackMessage({ message }: { message: string }) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: 44,
        border: "1px dashed var(--border-soft)",
        borderRadius: 14,
        display: "grid",
        alignItems: "center",
        padding: "10px 14px",
        color: "var(--text-muted)",
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      {message}
    </div>
  );
}
