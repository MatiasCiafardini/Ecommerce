import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const blushThemeTokens = {
  colors: {
    background: "#fdf5f2",
    backgroundSoft: "#f7ece6",
    backgroundElevated: "#f0e0d8",
    paper: "#fffaf8",
    paperMuted: "#f2e6e0",
    text: "#7a5c58",
    textMuted: "rgba(100,72,68,0.6)",
    textStrong: "#4a2e2a",
    border: "rgba(160,100,90,0.12)",
    borderStrong: "rgba(160,100,90,0.22)",
    accent: "#c87d72",
    accentStrong: "#a85e54",
    accentContrast: "#fffaf8",
  },
  shape: {
    cardRadius: 16,
    panelRadius: 20,
    mediaRadius: 12,
    shellRadius: 24,
    pillRadius: 999,
  },
  motion: {
    blockEnter: "theme-enter-soft",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 380,
    ambient: false,
    pulse: false,
  },
};

const blush: Theme = {
  name: "blush",
  className: "theme-blush",
  Header,
  Footer,
  tokens: blushThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Para vos, siempre",
        editorialLabel: "Blush edit",
        editorialTitle: "Prendas que abrazan con elegancia y delicadeza",
      },
    },
  },
};

export default blush;
