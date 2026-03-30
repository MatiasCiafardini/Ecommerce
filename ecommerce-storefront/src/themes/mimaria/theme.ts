import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const mimariaThemeTokens = {
  colors: {
    background: "#cfb182",
    backgroundSoft: "#dcc19a",
    backgroundElevated: "#e7d2b4",
    paper: "#f6efe5",
    paperMuted: "#d8bf9a",
    text: "#624a31",
    textMuted: "rgba(98,74,49,0.72)",
    textStrong: "#513923",
    border: "rgba(98,74,49,0.16)",
    borderStrong: "rgba(98,74,49,0.28)",
    accent: "#b48f62",
    accentStrong: "#9a744c",
    accentContrast: "#fffaf4",
    accentSoft: "#ead9c0",
    olive: "#a49a7c",
  },
  shape: {
    cardRadius: 26,
    panelRadius: 34,
    mediaRadius: 24,
    shellRadius: 40,
    pillRadius: 999,
  },
  motion: {
    blockEnter: "theme-enter-soft",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 360,
    ambient: false,
    pulse: false,
  },
};

const mimaria: Theme = {
  name: "mimaria",
  className: "theme-fashion theme-mimaria",
  Header,
  Footer,
  tokens: mimariaThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para una silueta femenina y actual",
        editorialLabel: "Mi Maria edit",
        editorialTitle: "Prendas versatiles para vestir todos los dias con elegancia",
      },
    },
  },
};

export default mimaria;
