import Header from "./Header";
import Footer from "./Footer";
import type { Theme } from "@/types/theme";

export const trojaniThemeTokens = {
  colors: {
    background: "#ffffff",
    backgroundSoft: "#f8f8f8",
    backgroundElevated: "#f0f0f0",
    paper: "#ffffff",
    paperMuted: "#e8e8e8",
    text: "#555555",
    textMuted: "rgba(50,50,50,0.58)",
    textStrong: "#111111",
    border: "rgba(0,0,0,0.09)",
    borderStrong: "rgba(0,0,0,0.16)",
    accent: "#8f5f3f",
    accentStrong: "#5f3824",
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

const trojaniTheme: Theme = {
  name: "trojani",
  className: "theme-trojani",
  Header,
  Footer,
  tokens: trojaniThemeTokens,
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

export default trojaniTheme;
