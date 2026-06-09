"use client";

import { themes } from "@/config/theme-registry";
import AnnouncementTicker from "@/components/store/AnnouncementTicker";
import { buildThemeStyle } from "@/lib/theme/theme-palette-style";
import type { ThemePalette } from "@/types/theme";
import type { StorefrontThemeLayout } from "@/types/storefront-config";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

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
  const { user } = useAuth();
  const pathname = usePathname();
  const theme = themes[themeName as keyof typeof themes];

  if (!theme) return <>{children}</>;

  const Header = "Header" in theme ? theme.Header : null;
  const Footer = "Footer" in theme ? theme.Footer : null;
  const themeStyle = buildThemeStyle(theme.tokens, themePalette);
  const isAdmin = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(user?.role ?? "");
  const isAdminWorkspace =
    pathname === "/account" || pathname === "/manual-sales";
  const showStoreChrome = !(isAdmin && isAdminWorkspace);

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
      {showStoreChrome ? (
        <>
          <AnnouncementTicker text={themeLayout?.header?.announcementText} />
          {Header && <Header themeLayout={themeLayout} />}
        </>
      ) : null}

      <main>{children}</main>

      {showStoreChrome && Footer ? <Footer themeLayout={themeLayout} /> : null}
    </div>
  );
}
