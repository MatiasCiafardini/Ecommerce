import type { Theme } from "@/types/theme";
import Header from "@/themes/milashoes/Header";
import Footer from "@/themes/milashoes/Footer";
import { milashoesThemeTokens } from "@/themes/milashoes/theme";

const comovosyyo: Theme = {
  name: "comovosyyo",
  className: "theme-milashoes",
  Header,
  Footer,
  tokens: milashoesThemeTokens,
  blocks: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para el street",
        editorialLabel: "Urban people",
        editorialTitle: "Editorial street energy",
      },
    },
  },
};

export default comovosyyo;
