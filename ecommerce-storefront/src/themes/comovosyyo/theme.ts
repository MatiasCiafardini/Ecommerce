import type { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

const comovosyyo: Theme = {
  name: "comovosyyo",
  className: "theme-milashoes theme-comovosyyo",
  Header,
  Footer,
  tokens: {
    colors: {
      background: "#F5F1EA",
      backgroundSoft: "#F5F1EA",
      backgroundElevated: "#BFD5CF",
      paper: "#F5F1EA",
      paperMuted: "#BFD5CF",
      text: "#1A1A1A",
      textMuted: "#6E6E6E",
      textStrong: "#1A1A1A",
      border: "rgba(26, 26, 26, 0.12)",
      borderStrong: "#73B5A5",
      accent: "#73B5A5",
      accentStrong: "#73B5A5",
      accentContrast: "#1A1A1A",
      accentSoft: "#BFD5CF",
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
  },
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para tu guardarropa",
        editorialLabel: "Como Vos y Yo",
        editorialTitle: "Prendas suaves, versatiles y faciles de combinar",
      },
    },
  },
};

export default comovosyyo;
