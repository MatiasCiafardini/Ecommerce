"use client";

import { themes } from "@/config/theme-registry";
import type { CSSProperties } from "react";

const toCssVarName = (path: string[]) =>
  `--theme-${path
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase())
    .join("-")}`;

const flattenThemeTokens = (
  value: unknown,
  path: string[] = [],
): Record<string, string | number> => {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    if (path.length === 0) return {};
    return { [toCssVarName(path)]: value as string | number };
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [key, nestedValue]) => ({
      ...acc,
      ...flattenThemeTokens(nestedValue, [...path, key]),
    }),
    {},
  );
};

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
  const themeStyle = flattenThemeTokens(theme.tokens) as CSSProperties;

  return (
    <div className={theme.className} style={themeStyle}>
      {Header && <Header />}

      <main>{children}</main>

      {Footer && <Footer />}
    </div>
  );
}
