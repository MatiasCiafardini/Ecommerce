"use client";

import { themes } from "@/config/theme-registry";

export default function ThemeProvider({
  themeName,
  children,
}: {
  themeName: string;
  children: React.ReactNode;
}) {
  const theme = themes[themeName];

  if (!theme) return <>{children}</>;

  const Header = theme.Header;
  const Footer = theme.Footer;

  return (
    <>
      {Header && <Header />}

      <main>{children}</main>

      {Footer && <Footer />}
    </>
  );
}
