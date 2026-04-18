import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const urbanThemeTokens = {
  colors: {
    background: "#101010",
    backgroundSoft: "#181818",
    backgroundElevated: "#222222",
    paper: "#f4f4f4",
    paperMuted: "#e0e0e0",
    text: "#cccccc",
    textMuted: "rgba(204,204,204,0.65)",
    textStrong: "#ffffff",
    border: "rgba(255,255,255,0.1)",
    borderStrong: "rgba(255,255,255,0.18)",
    accent: "#e8ff00",
    accentStrong: "#c8df00",
    accentContrast: "#101010",
  },
  shape: {
    cardRadius: 0,
    panelRadius: 0,
    mediaRadius: 0,
    shellRadius: 0,
    pillRadius: 0,
  },
  motion: {
    blockEnter: "theme-enter-up",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 280,
    ambient: true,
    pulse: false,
  },
};

const urban: Theme = {
  name: "urban",
  className: "theme-urban",
  Header,
  Footer,
  tokens: urbanThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Drops de la semana",
        editorialLabel: "Urban drop",
        editorialTitle: "Siluetas amplias y basicos limpios para la ciudad",
      },
    },
  },
};

export default urban;
