import Header from "./Header";
import Footer from "./Footer";

export const minimalThemeTokens = {
  colors: {
    background: "#0b0b0b",
    backgroundSoft: "#151515",
    backgroundElevated: "#1d1d1d",
    paper: "#f3eee7",
    paperMuted: "#d8d1c8",
    text: "#f7f1e8",
    textMuted: "rgba(247,241,232,0.7)",
    textStrong: "#ffffff",
    border: "rgba(255,255,255,0.1)",
    borderStrong: "rgba(255,255,255,0.18)",
  },
  motion: {
    blockEnter: "theme-enter-up",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 520,
  },
};

const minimalTheme = {
  name: "minimal",
  Header,
  Footer,
  tokens: minimalThemeTokens,
};

export default minimalTheme;
