import type { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const milashoesThemeTokens = {
  colors: {
    background: "#ffffff",
    backgroundSoft: "#fdfdfd",
    backgroundElevated: "#ffffff",
    paper: "#ffffff",
    paperMuted: "#f7f7f5",
    text: "#1a1a1a",
    textMuted: "rgba(26,26,26,0.62)",
    textStrong: "#000000",
    border: "rgba(0,0,0,0.08)",
    borderStrong: "rgba(0,0,0,0.14)",
    accent: "#efefec",
    accentStrong: "#e5e5e0",
    accentContrast: "#000000",
    accentSoft: "#f5f5f2",
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
    duration: 440,
  },
};

const milashoes: Theme = {
  name: "milashoes",
  className: "theme-milashoes",
  Header,
  Footer,
  tokens: milashoesThemeTokens,
};

export default milashoes;
