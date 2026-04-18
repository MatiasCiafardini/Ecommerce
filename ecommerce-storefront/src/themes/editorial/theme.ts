import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const editorialThemeTokens = {
  colors: {
    background: "#f4f0ea",
    backgroundSoft: "#ede8e0",
    backgroundElevated: "#e6dfd5",
    paper: "#f4f0ea",
    paperMuted: "#e6dfd5",
    text: "#5a5248",
    textMuted: "rgba(60,52,44,0.56)",
    textStrong: "#1a1410",
    border: "rgba(26,20,16,0.12)",
    borderStrong: "rgba(26,20,16,0.24)",
    accent: "#1a1410",
    accentStrong: "#000000",
    accentContrast: "#f4f0ea",
  },
  shape: {
    cardRadius: 0,
    panelRadius: 0,
    mediaRadius: 0,
    shellRadius: 0,
    pillRadius: 0,
  },
  motion: {
    blockEnter: "theme-enter-soft",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 240,
    ambient: false,
    pulse: false,
  },
};

const editorial: Theme = {
  name: "editorial",
  className: "theme-editorial",
  Header,
  Footer,
  tokens: editorialThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Temporada",
        editorialLabel: "The Edit",
        editorialTitle: "Piezas de autor para una silueta definida",
      },
    },
  },
};

export default editorial;
