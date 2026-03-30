import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const fashionThemeTokens = {
  colors: {
    background: "#f6efe6",
    backgroundSoft: "#fff8f2",
    backgroundElevated: "#fffdf9",
    paper: "#fffdf9",
    paperMuted: "#ead8ca",
    text: "#6a5247",
    textMuted: "rgba(106,82,71,0.76)",
    textStrong: "#6a5247",
    border: "rgba(123,103,90,0.24)",
    borderStrong: "rgba(123,103,90,0.38)",
    accent: "#8f7868",
    accentStrong: "#786353",
    accentContrast: "#fffdf9",
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
    duration: 360,
    ambient: false,
    pulse: false,
  },
};

const fashion: Theme = {
  name: "fashion",
  className: "theme-fashion",
  Header,
  Footer,
  tokens: fashionThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para una silueta suave",
        editorialLabel: "Aurea edit",
        editorialTitle: "Texturas claras y capas que combinan sin esfuerzo",
      },
    },
  },
};

export default fashion;
