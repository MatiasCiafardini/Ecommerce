import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const mimariaThemeTokens = {
  colors: {
    background: "#C5A87C",
    backgroundSoft: "#D6BE99",
    backgroundElevated: "#E5D6BD",
    paper: "#FBF6EF",
    paperMuted: "#EEE2D1",
    text: "#745A39",
    textMuted: "rgba(116,90,57,0.72)",
    textStrong: "#543F24",
    border: "rgba(116,90,57,0.14)",
    borderStrong: "rgba(116,90,57,0.24)",
    accent: "#C5A87C",
    accentStrong: "#AE8E5F",
    accentContrast: "#FFF9F1",
    accentSoft: "#E7D8BF",
    olive: "#B79F78",
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
    duration: 360,
    ambient: false,
    pulse: false,
  },
};

export const mimariaPreviousThemeTokens = {
  colors: {
    background: "#ccb083",
    backgroundSoft: "#dcc39d",
    backgroundElevated: "#e7d7bc",
    paper: "#fcf8f1",
    paperMuted: "#efe3d0",
    text: "#7b5d3c",
    textMuted: "rgba(123,93,60,0.72)",
    textStrong: "#5f4529",
    border: "rgba(108,83,54,0.14)",
    borderStrong: "rgba(108,83,54,0.24)",
    accent: "#ccb083",
    accentStrong: "#b79262",
    accentContrast: "#fffaf3",
    accentSoft: "#eadbc3",
    olive: "#b89f79",
  },
} as const;

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
