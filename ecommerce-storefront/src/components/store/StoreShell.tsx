"use client";

import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

export default function StoreShell({
  themeName,
  children,
}: {
  themeName?: string | null;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const whatsappConfig = getWhatsAppConfig(themeName);
  const isAdmin = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user?.role ?? "");
  const isAdminWorkspace =
    pathname === "/account" || pathname === "/manual-sales";
  const showWhatsApp = Boolean(whatsappConfig) && !(isAdmin && isAdminWorkspace);

  return (
    <div data-store-shell style={{ minHeight: "100vh" }}>
      <main data-store-content>{children}</main>
      {showWhatsApp && whatsappConfig ? (
        <WhatsAppFloatingButton {...whatsappConfig} />
      ) : null}
    </div>
  );
}

function getWhatsAppConfig(themeName?: string | null) {
  if (themeName === "trojani") {
    return {
      phone: "5492326440747",
      message: "Hola! Quiero hacer una consulta sobre Trojani.",
    };
  }

  if (themeName === "comovosyyo") {
    return {
      phone: "5492326494545",
      message: "Hola! Quiero hacer una consulta sobre Como Vos y Yo.",
    };
  }

  return null;
}

function WhatsAppFloatingButton({
  phone,
  message,
}: {
  phone: string;
  message: string;
}) {
  const encodedMessage = encodeURIComponent(message);

  return (
    <a
      href={`https://wa.me/${phone}?text=${encodedMessage}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar por WhatsApp"
      title="WhatsApp"
      style={{
        position: "fixed",
        right: "max(18px, env(safe-area-inset-right))",
        bottom: "max(18px, env(safe-area-inset-bottom))",
        zIndex: 2147483000,
        width: 60,
        height: 60,
        borderRadius: 999,
        background: "#25D366",
        color: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 16px 30px rgba(37, 211, 102, 0.34)",
        textDecoration: "none",
      }}
    >
      <svg
        aria-hidden="true"
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
      >
        <path
          fill="currentColor"
          d="M16.02 5.333c-5.87 0-10.638 4.695-10.638 10.475 0 1.847.49 3.652 1.42 5.248L5.333 26.667l5.82-1.43a10.75 10.75 0 0 0 4.867 1.16h.005c5.869 0 10.642-4.696 10.642-10.476 0-2.801-1.132-5.437-3.189-7.424-2.05-1.99-4.777-3.164-7.458-3.164Zm0 19.294h-.004a8.93 8.93 0 0 1-4.54-1.237l-.326-.193-3.454.85.923-3.332-.211-.34a8.642 8.642 0 0 1-1.339-4.567c0-4.81 3.976-8.723 8.954-8.723 2.39 0 4.636.93 6.321 2.619 1.686 1.624 2.613 3.787 2.613 6.104 0 4.81-3.98 8.72-8.937 8.72Zm4.92-6.486c-.267-.128-1.576-.766-1.82-.852-.244-.085-.421-.128-.6.128-.178.255-.688.852-.844 1.022-.155.171-.31.192-.577.064-.267-.128-1.128-.409-2.148-1.304-.793-.695-1.328-1.554-1.484-1.81-.155-.255-.016-.393.117-.52.12-.116.267-.298.4-.447.133-.149.178-.255.267-.426.089-.17.044-.319-.023-.447-.066-.128-.6-1.426-.821-1.958-.217-.52-.438-.447-.6-.455l-.51-.008a.977.977 0 0 0-.71.34c-.244.256-.933.916-.933 2.235 0 1.32.978 2.596 1.111 2.767.133.17 1.918 3.037 4.73 4.133.669.286 1.19.456 1.596.583.67.213 1.28.183 1.762.111.537-.079 1.576-.639 1.798-1.256.221-.618.221-1.15.155-1.256-.067-.107-.245-.171-.512-.298Z"
        />
      </svg>
    </a>
  );
}
