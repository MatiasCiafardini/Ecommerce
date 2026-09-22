import CategoryImageStrip from "@/blocks/category-image-strip/CategoryImageStrip";

const items = [
  {
    title: "Remeras y blusas",
    image: "/images/comovosyyo/categoria-remeras-blusas.png",
    categorySlugs: ["remeras", "remeras-y-musculosas", "camisas-y-blusas"],
  },
  {
    title: "Pantalones",
    image: "/images/comovosyyo/categoria-pantalones.png",
    categorySlugs: ["pantalones"],
  },
  {
    title: "Accesorios",
    image: "/images/comovosyyo/categoria-accesorios.png",
    categorySlugs: ["accesorios"],
  },
];

export default function ComoVosYYoCategories() {
  return <CategoryImageStrip items={items} />;
}
