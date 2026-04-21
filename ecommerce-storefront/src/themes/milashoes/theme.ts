import type { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const milashoesThemeTokens = {
  colors: {
    background: "#FFFFFF",
    backgroundSoft: "#F7F7F7",
    backgroundElevated: "#EFEFEF",
    paper: "#FFFFFF",
    paperMuted: "#F7F7F7",
    text: "#111111",
    textMuted: "#888888",
    textStrong: "#000000",
    border: "#E8E8E8",
    borderStrong: "#D0D0D0",
    accent: "#000000",
    accentStrong: "#111111",
    accentContrast: "#FFFFFF",
    accentSoft: "#F7F7F7",
  },
  shape: {
    cardRadius: 12,
    panelRadius: 16,
    mediaRadius: 8,
    shellRadius: 20,
    pillRadius: 999,
  },
  motion: {
    blockEnter: "theme-enter-up",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 480,
  },
};

const milashoes: Theme = {
  name: "milashoes",
  className: "theme-milashoes",
  Header,
  Footer,
  tokens: milashoesThemeTokens,
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

export default milashoes;
