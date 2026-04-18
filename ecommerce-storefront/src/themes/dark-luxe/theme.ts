import { Theme } from "@/types/theme";
import Header from "./Header";
import Footer from "./Footer";

export const darkLuxeThemeTokens = {
  colors: {
    background: "#0a0806",
    backgroundSoft: "#130f0a",
    backgroundElevated: "#1c1710",
    paper: "#f5f0e8",
    paperMuted: "#e0d8cb",
    text: "#c8bfb0",
    textMuted: "rgba(200,191,176,0.68)",
    textStrong: "#f0e8d8",
    border: "rgba(200,180,140,0.1)",
    borderStrong: "rgba(200,180,140,0.2)",
    accent: "#c8a96e",
    accentStrong: "#a8893e",
    accentContrast: "#0a0806",
  },
  shape: {
    cardRadius: 0,
    panelRadius: 2,
    mediaRadius: 0,
    shellRadius: 0,
    pillRadius: 2,
  },
  motion: {
    blockEnter: "theme-enter-soft",
    blockEnterSoft: "theme-enter-soft",
    blockHover: "theme-hover-lift",
    buttonHover: "theme-button",
    duration: 400,
    ambient: false,
    pulse: false,
  },
};

const darkLuxe: Theme = {
  name: "dark-luxe",
  className: "theme-dark-luxe",
  Header,
  Footer,
  tokens: darkLuxeThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Selección de alta gama",
        editorialLabel: "Dark Luxe edit",
        editorialTitle: "Piezas que definen la noche con elegancia absoluta",
      },
    },
  },
};

export default darkLuxe;
