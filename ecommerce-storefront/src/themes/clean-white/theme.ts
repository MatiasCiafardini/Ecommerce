import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const cleanWhiteThemeTokens = {
  colors: {
    background: "#ffffff",
    backgroundSoft: "#f8f8f8",
    backgroundElevated: "#f2f2f2",
    paper: "#ffffff",
    paperMuted: "#f4f4f4",
    text: "#666666",
    textMuted: "rgba(80,80,80,0.6)",
    textStrong: "#111111",
    border: "rgba(0,0,0,0.07)",
    borderStrong: "rgba(0,0,0,0.14)",
    accent: "#111111",
    accentStrong: "#000000",
    accentContrast: "#ffffff",
  },
  shape: {
    cardRadius: 0,
    panelRadius: 0,
    mediaRadius: 0,
    shellRadius: 0,
    pillRadius: 999,
  },
  motion: {
    blockEnter: "theme-enter-soft",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 300,
    ambient: false,
    pulse: false,
  },
};

const cleanWhite: Theme = {
  name: "clean-white",
  className: "theme-clean-white",
  Header,
  Footer,
  tokens: cleanWhiteThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Colección",
        editorialLabel: "Edit",
        editorialTitle: "Piezas esenciales para cada dia",
      },
    },
  },
};

export default cleanWhite;
