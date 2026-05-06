import "./(store)/globals.css";
import "@/shared/styles/base.css";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Script from "next/script";

const displayFont = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
  preload: true,
});

const bodyFont = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {process.env.NODE_ENV === "development" ? (
          <Script
            id="suppress-next-fast-refresh-logs"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (() => {
                  const originalLog = console.log.bind(console);
                  console.log = (...args) => {
                    const firstArg = args[0];
                    if (
                      typeof firstArg === "string" &&
                      firstArg.startsWith("[Fast Refresh]")
                    ) {
                      return;
                    }
                    originalLog(...args);
                  };
                })();
              `,
            }}
          />
        ) : null}
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
