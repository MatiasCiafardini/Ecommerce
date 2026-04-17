import Header from "./Header";
import Footer from "./Footer";
import type { Theme } from "@/types/theme";

export const trojaniThemeTokens = {
  colors: {
    background: "#f7f2ec",
    backgroundSoft: "#fffaf6",
    backgroundElevated: "#f0e4d7",
    paper: "#fffdfa",
    paperMuted: "#e5d4c4",
    text: "#6b5446",
    textMuted: "rgba(107,84,70,0.72)",
    textStrong: "#5a4335",
    border: "rgba(167,136,111,0.22)",
    borderStrong: "rgba(167,136,111,0.36)",
    accent: "#c08a60",
    accentStrong: "#9b6844",
    accentContrast: "#fffaf5",
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
