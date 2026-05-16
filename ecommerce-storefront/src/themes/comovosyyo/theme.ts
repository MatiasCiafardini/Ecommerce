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
      backgroundSoft: "#BFD5CF",
      backgroundElevated: "#D8C7B5",
      paper: "#F5F1EA",
      paperMuted: "#BFD5CF",
      text: "#1A1A1A",
      textMuted: "#6E6E6E",
      textStrong: "#1A1A1A",
      border: "#D8C7B5",
      borderStrong: "#8DBBB3",
      accent: "#8DBBB3",
      accentStrong: "#8DBBB3",
      accentContrast: "#F5F1EA",
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
        eyebrow: "Curado para el street",
        editorialLabel: "Urban people",
        editorialTitle: "Editorial street energy",
      },
    },
  },
};

export default comovosyyo;
