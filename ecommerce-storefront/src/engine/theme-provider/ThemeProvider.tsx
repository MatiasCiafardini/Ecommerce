"use client";

import { themes } from "@/config/theme-registry";

export default function ThemeProvider({
  themeName,
  children,
}: {
  themeName: string;
  children: React.ReactNode;
}) {
  const theme = themes[themeName as keyof typeof themes];

  if (!theme) return <>{children}</>;

  const Header = "Header" in theme ? theme.Header : null;
  const Footer = "Footer" in theme ? theme.Footer : null;

  return (
    <>
      {Header && <Header />}

      <main>{children}</main>

      {Footer && <Footer />}
    </>
  );
}
