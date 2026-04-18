"use client";

import { themes } from "@/config/theme-registry";
import AnnouncementTicker from "@/components/store/AnnouncementTicker";
import { buildThemeStyle } from "@/lib/theme/theme-palette-style";
import type { ThemePalette } from "@/types/theme";
import type { StorefrontThemeLayout } from "@/types/storefront-config";

export default function ThemeProvider({
  themeName,
  themePalette,
  themeLayout,
  children,
}: {
  themeName: string;
  themePalette?: ThemePalette;
  themeLayout?: StorefrontThemeLayout;
  children: React.ReactNode;
}) {
  const theme = themes[themeName as keyof typeof themes];

  if (!theme) return <>{children}</>;

  const Header = "Header" in theme ? theme.Header : null;
  const Footer = "Footer" in theme ? theme.Footer : null;
  const themeStyle = buildThemeStyle(theme.tokens, themePalette);

  return (
    <div className={theme.className} style={themeStyle}>
      {themeName === "mimaria" ? (
        <style jsx global>{`
          html,
          body {
            background: rgba(198, 186, 176, 1);
            overscroll-behavior-y: none;
          }
        `}</style>
      ) : null}
      <AnnouncementTicker text={themeLayout?.header?.announcementText} />
      {Header && <Header themeLayout={themeLayout} />}

      <main>{children}</main>

      {Footer && <Footer themeLayout={themeLayout} />}
    </div>
  );
}
