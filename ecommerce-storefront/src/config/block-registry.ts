import Hero from "@/blocks/hero/Hero";
import ProductGrid from "@/blocks/product-grid/ProductGrid";
import Carousel from "@/blocks/carousel/Carousel";
import CategoryGrid from "@/blocks/category-grid/CategoryGrid";
import FeaturedProducts from "@/blocks/featured-products/FeaturedProducts";
import Newsletter from "@/blocks/newsletter/Newsletter";
import Banner from "@/blocks/banner/Banner";
import Testimonials from "@/blocks/testimonials/Testimonials";
import HeroCarousel from "@/blocks/hero-carousel/HeroCarousel";
import { blockThemeOverrides } from "@/config/block-theme-overrides";
import type { ThemeBlockDefinition } from "@/types/block";

export const defaultBlockRegistry = {
  hero: Hero,
  hero_carousel: HeroCarousel,
  product_grid: ProductGrid,
  carousel: Carousel,
  category_grid: CategoryGrid,
  featured_products: FeaturedProducts,
  newsletter: Newsletter,
  banner: Banner,
  testimonials: Testimonials,
};

export function resolveBlockDefinition(
  themeName: string | undefined,
  blockType: string,
): ThemeBlockDefinition | null {
  const defaultComponent =
    defaultBlockRegistry[blockType as keyof typeof defaultBlockRegistry];

  if (!defaultComponent) {
    return null;
  }

  const themedDefinition =
    themeName && blockThemeOverrides[themeName]
      ? blockThemeOverrides[themeName][blockType]
      : undefined;

  return {
    component: themedDefinition?.component ?? defaultComponent,
    defaultProps: themedDefinition?.defaultProps,
  };
}
