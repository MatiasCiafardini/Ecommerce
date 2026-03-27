import Header from "./Header";
import Footer from "./Footer";
import type { Theme } from "@/types/theme";

export const libreriaThemeTokens = {
  colors: {
    background: "#fff1f6",
    backgroundSoft: "#fff8fb",
    backgroundElevated: "#ffffff",
    paper: "#ffffff",
    paperMuted: "#f6dbe7",
    text: "#8f6577",
    textMuted: "rgba(143,101,119,0.74)",
    textStrong: "#6d4355",
    border: "rgba(109,67,85,0.16)",
    borderStrong: "rgba(109,67,85,0.28)",
    accent: "#e8a9c1",
    accentStrong: "#cf84a3",
    accentContrast: "#ffffff",
  },
  shape: {
    cardRadius: 24,
    panelRadius: 28,
    mediaRadius: 22,
    shellRadius: 30,
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

const libreria: Theme = {
  name: "libreria",
  className: "theme-libreria",
  Header,
  Footer,
  tokens: libreriaThemeTokens,
};

export default libreria;
