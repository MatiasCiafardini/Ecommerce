"use client";

import { themes } from "@/config/theme-registry";
import { buildThemeStyle } from "@/lib/theme/theme-palette-style";
import type { ThemePalette } from "@/types/theme";

export default function ThemeProvider({
  themeName,
  themePalette,
  children,
}: {
  themeName: string;
  themePalette?: ThemePalette;
  children: React.ReactNode;
}) {
  const theme = themes[themeName as keyof typeof themes];

  if (!theme) return <>{children}</>;

  const Header = "Header" in theme ? theme.Header : null;
  const Footer = "Footer" in theme ? theme.Footer : null;
  const themeStyle = buildThemeStyle(theme.tokens, themePalette);

  return (
    <div className={theme.className} style={themeStyle}>
      {Header && <Header />}

      <main>{children}</main>

      {Footer && <Footer />}
    </div>
  );
}
