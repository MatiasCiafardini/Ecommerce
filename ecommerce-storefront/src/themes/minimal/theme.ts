import Header from "./Header";
import Footer from "./Footer";
import type { Theme } from "@/types/theme";

export const minimalThemeTokens = {
  colors: {
    background: "#0b0b0b",
    backgroundSoft: "#151515",
    backgroundElevated: "#1d1d1d",
    paper: "#f3eee7",
    paperMuted: "#d8d1c8",
    text: "#f7f1e8",
    textMuted: "rgba(247,241,232,0.7)",
    textStrong: "#ffffff",
    border: "rgba(255,255,255,0.1)",
    borderStrong: "rgba(255,255,255,0.18)",
    accent: "#8e6d54",
    accentStrong: "#6f5340",
    accentContrast: "#ffffff",
  },
  shape: {
    cardRadius: 28,
    panelRadius: 32,
    mediaRadius: 22,
    shellRadius: 36,
    pillRadius: 999,
  },
  motion: {
    blockEnter: "theme-enter-up",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 520,
  },
};

const minimalTheme: Theme = {
  name: "minimal",
  className: "theme-minimal",
  Header,
  Footer,
  tokens: minimalThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para el street",
        editorialLabel: "Urban people",
        editorialTitle: "Editorial street energy",
      },
    },
  },
};

export default minimalTheme;
