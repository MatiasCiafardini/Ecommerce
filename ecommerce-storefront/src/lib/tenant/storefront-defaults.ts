import type { Block } from "@/types/block";
import type { ThemePalette } from "@/types/theme";

export type StorefrontTenantConfig = {
  theme: string;
  themePalette?: ThemePalette;
  pages: {
    home: Block[];
  };
};

const safeEmptyStorefrontConfig: StorefrontTenantConfig = {
  theme: "minimal",
  pages: {
    home: [],
  },
};

const storefrontDefaultThemeIds = {
  minimal: 1,
  fashion: 2,
  trojani: 3003,
  libreria: 4,
  mimaria: 3005,
} as const;

const storefrontDefaultAliases: Record<number, number> = {
  3: 3003,
};

export const storefrontDefaults: Record<number, StorefrontTenantConfig> = {
  1: {
    theme: "minimal",
    pages: {
      home: [
        {
          type: "hero",
          props: {
            title: "Streetwear esencial para todos los dias",
            subtitle:
              "Remeras pesadas, pantalones relajados y capas urbanas para armar un look solido sin esfuerzo. Basicos con presencia, hechos para rotar toda la semana.",
            buttonText: "Ver catalogo",
            buttonLink: "/product",
            image: "/images/fondo-urbano.png",
            backgroundColor: "#161616",
            textColor: "white",
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Drop nuevo activo - compra hoy y define tu entrega en el checkout",
            backgroundColor: "#ddd4c7",
            textColor: "#141414",
            animationPreset: "none",
          },
        },
        {
          type: "featured_products",
          props: {
            title: "Piezas clave para empezar el look",
            columns: 3,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Lo nuevo que ya esta rotando",
            limit: 8,
            columns: 4,
            animationPreset: "soft",
          },
        },
        { type: "testimonials", props: { animationPreset: "soft" } },
        {
          type: "carousel",
          props: {
            title: "Favoritos de la comunidad",
            limit: 6,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Remeras para usar sin pensar demasiado",
            category: "remeras",
            limit: 4,
            columns: 2,
            animationPreset: "soft",
          },
        },
        {
          type: "newsletter",
          props: {
            title: "Entra al drop list",
            subtitle:
              "Recibi lanzamientos, reposiciones y descuentos antes que el resto.",
            animationPreset: "soft",
          },
        },
      ],
    },
  },
  2: {
    theme: "fashion",
    pages: {
      home: [
        {
          type: "hero_carousel",
          props: {
            showContentCard: false,
            buttonText: "Comprar ahora",
            buttonLink: "/product",
            slides: [
              {
                image: "/images/seed-catalog/promo-running-1.png",
                eyebrow: "Promocion",
                title: "Hasta 50% de descuento",
                subtitle: "Aprovecha las promociones destacadas.",
              },
              {
                image: "/images/seed-catalog/promo-running-2.png",
                eyebrow: "Nueva Coleccion",
                title: "Elegancia femenina",
                subtitle: "",
              },
              {
                image: "/images/seed-catalog/promo-running-3.png",
                eyebrow: "Nuevos ingresos",
                title: "Lineas limpias para hoy",
                subtitle: "Descubre lo nuevo de la temporada.",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Nueva edicion clara y calida para regalos, capas livianas y esenciales de temporada",
            backgroundColor: "#f5e8dc",
            textColor: "#231815",
            animationPreset: "none",
          },
        },
        {
          type: "featured_products",
          props: {
            title: "Seleccion Aurea",
            limit: 3,
            columns: 3,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Prendas para combinar sin esfuerzo",
            limit: 8,
            columns: 4,
            animationPreset: "soft",
          },
        },
        { type: "testimonials", props: { animationPreset: "soft" } },
        {
          type: "carousel",
          props: {
            title: "Favoritos para regalar",
            limit: 6,
            animationPreset: "soft",
          },
        },
        {
          type: "newsletter",
          props: {
            title: "Sumate a la lista privada",
            subtitle:
              "Recibi lanzamientos, restocks y recomendaciones suaves para armar tu guardarropa con tiempo.",
            animationPreset: "soft",
          },
        },
      ],
    },
  },
  3003: {
    theme: "trojani",
    pages: {
      home: [
        {
          type: "hero_carousel",
          props: {
            showContentCard: false,
            buttonText: "Comprar ahora",
            buttonLink: "/product",
            slides: [
              {
                image: "/images/trojani/fondo_banner.png",
                eyebrow: "Promocion",
                title: "Hasta 50% de descuento",
                subtitle: "Aprovecha las promociones destacadas.",
              },
              {
                image: "/images/trojani/fondo_banner2.png",
                eyebrow: "Nueva Coleccion",
                title: "Elegancia femenina",
                subtitle: "",
              },
              {
                image: "/images/trojani/fondo_banner3.png",
                eyebrow: "Nuevos ingresos",
                title: "Lineas limpias para hoy",
                subtitle: "Descubre lo nuevo de la temporada.",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Drop nuevo activo, compra hoy y define tu entrega en el checkout",
            backgroundColor: "#ddd4c7",
            textColor: "#141414",
            animationPreset: "none",
          },
        },
        {
          type: "featured_products",
          props: {
            title: "Piezas clave para empezar el look",
            columns: 3,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Lo nuevo que ya esta rotando",
            limit: 8,
            columns: 4,
            animationPreset: "soft",
          },
        },
        { type: "testimonials", props: { animationPreset: "soft" } },
        {
          type: "carousel",
          props: {
            title: "Favoritos de la comunidad",
            limit: 6,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Remeras para usar sin pensar demasiado",
            category: "remeras",
            limit: 4,
            columns: 2,
            animationPreset: "soft",
          },
        },
        {
          type: "newsletter",
          props: {
            title: "Entra al drop list",
            subtitle:
              "Recibi lanzamientos, reposiciones y descuentos antes que el resto.",
            animationPreset: "soft",
          },
        },
      ],
    },
  },
  4: {
    theme: "libreria",
    pages: {
      home: [
        {
          type: "hero_carousel",
          props: {
            buttonText: "Ver todo",
            buttonLink: "/product",
            slides: [
              {
                image: "/images/libreria/fondo_banner1.jpeg",
                eyebrow: "Vuelta al cole",
                title: "Papeleria, utiles y color para arrancar el año",
                subtitle:
                  "Todo para clases, escritorio y creatividad en un solo lugar.",
              },
              {
                image: "/images/libreria/fondo_banner2.jpeg",
                eyebrow: "Libros y regalos",
                title: "Articulos para regalar todo el año",
                subtitle: "Encuentra opciones para leer, regalar y sorprender.",
              },
              {
                image: "/images/libreria/fondo_banner1.jpeg",
                eyebrow: "Fiestas y antojos",
                title: "Cotillon, golosinas y extras para resolver rapido",
                subtitle:
                  "Ideas practicas para celebraciones, regalos y compras de ultimo momento.",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Libros, utiles escolares, golosinas y cotillon para cada momento del año",
            backgroundColor: "#fbe4ed",
            textColor: "#6d4355",
            animationPreset: "none",
          },
        },
        {
          type: "category_grid",
          props: {
            title: "Explora por rubro",
            columns: 3,
            animationPreset: "soft",
          },
        },
        {
          type: "featured_products",
          props: {
            title: "Seleccion para arrancar",
            limit: 3,
            columns: 3,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Vuelta al cole y escritorio",
            category: "utiles-escolares",
            limit: 8,
            columns: 4,
            eyebrow: "Mesa principal",
            editorialLabel: "Back to school",
            editorialTitle:
              "Kits, cuadernos y esenciales para una compra rapida",
            animationPreset: "soft",
          },
        },
        {
          type: "carousel",
          props: {
            title: "Ideas para regalo y fiesta",
            limit: 6,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Dulce y festivo",
            category: "cotillon",
            limit: 4,
            columns: 2,
            eyebrow: "Ultimo momento",
            editorialLabel: "Candy + deco",
            editorialTitle: "Globos, mesas dulces y combos para cumpleaños",
            animationPreset: "soft",
          },
        },
        {
          type: "newsletter",
          props: {
            title: "Recibi novedades de la tienda",
            subtitle:
              "Suscribite para conocer ingresos, promos y lanzamientos especiales.",
            animationPreset: "soft",
          },
        },
      ],
    },
  },
  3005: {
    theme: "mimaria",
    pages: {
      home: [
        {
          type: "hero_carousel",
          props: {
            showContentCard: false,
            buttonText: "Ver coleccion",
            buttonLink: "/product",
            slides: [
              {
                image: "/images/mimaria/fondo_banner.png",
                eyebrow: "Mi Maria Indumentaria",
                title: "Elegancia para todos los dias",
                subtitle:
                  "Prendas femeninas, delicadas y versatiles para una boutique moderna, calida y cercana.",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Descubri prendas pensadas para acompanarte todos los dias",
            backgroundColor: "#e8d7bd",
            textColor: "#7b5d3c",
            animationPreset: "none",
          },
        },
        {
          type: "featured_products",
          props: {
            title: "Destacados de Mi Maria",
            limit: 4,
            columns: 4,
            animationPreset: "soft",
          },
        },
        {
          type: "product_grid",
          props: {
            title: "Nuevos ingresos",
            limit: 8,
            columns: 4,
            eyebrow: "Recien llegados",
            editorialLabel: "Boutique edit",
            editorialTitle: "Prendas para renovar tu guardarropa con delicadeza",
            animationPreset: "soft",
          },
        },
        {
          type: "category_grid",
          props: {
            title: "",
            columns: 3,
            carousel: true,
            items: [
              {
                title: "Blusas",
                description: "Livianas, delicadas y faciles de combinar.",
                href: "/category/blusas",
                image: "/images/mimaria/categories/blusas.png",
                tone: "soft",
              },
              {
                title: "Sweaters",
                description: "Abrigo suave para un look elegante y relajado.",
                href: "/category/sweaters",
                image: "/images/mimaria/categories/sweaters.png",
                tone: "warm",
              },
              {
                title: "Jeans",
                description: "Bases nobles para todos los dias.",
                href: "/category/jeans",
                image: "/images/mimaria/categories/jeans.png",
                tone: "soft",
              },
              {
                title: "Vestidos",
                description: "Femeninos y versatiles para distintas ocasiones.",
                href: "/category/vestidos",
                image: "/images/mimaria/categories/vestidos.png",
                tone: "warm",
              },
              {
                title: "Tapados",
                description: "Capas con presencia y lineas limpias.",
                href: "/category/tapados",
                image: "/images/mimaria/categories/tapados.png",
                tone: "soft",
              },
              {
                title: "Camisas",
                description: "Clasicos livianos para looks pulidos y suaves.",
                href: "/category/camisas",
                image: "/images/mimaria/categories/camisas.png",
                tone: "warm",
              },
              {
                title: "Polleras",
                description: "Siluetas femeninas para dias delicados y versatiles.",
                href: "/category/polleras",
                image: "/images/mimaria/categories/polleras.png",
                tone: "soft",
              },
              {
                title: "Cardigans",
                description: "Tejidos nobles para sumar abrigo con liviandad.",
                href: "/category/cardigans",
                image: "/images/mimaria/categories/cardigans.png",
                tone: "warm",
              },
              {
                title: "Blazers",
                description: "Capas sastreras suaves para elevar cualquier conjunto.",
                href: "/category/blazers",
                image: "/images/mimaria/categories/blazers.png",
                tone: "soft",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Descubri prendas pensadas para acompanarte todos los dias",
            backgroundColor: "#f6efe5",
            textColor: "#7b5d3c",
            animationPreset: "soft",
          },
        },
        {
          type: "benefits",
          props: {
            title: "Todo listo para comprar con confianza",
            items: [
              {
                title: "Compra segura",
                description: "Procesos simples y confiables para que compres tranquila.",
                icon: "shield",
              },
              {
                title: "Envios a todo el pais",
                description: "Tu pedido llega donde estes, con seguimiento claro.",
                icon: "truck",
              },
              {
                title: "Atencion personalizada",
                description: "Te ayudamos con talles, estilos y elecciones.",
                icon: "heart",
              },
              {
                title: "Novedades todo el tiempo",
                description: "Ingresos nuevos durante toda la temporada.",
                icon: "spark",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "newsletter",
          props: {
            title: "Recibi novedades de Mi Maria",
            subtitle:
              "Suscribite para enterarte de nuevos ingresos, seleccion boutique y propuestas pensadas para vos.",
            animationPreset: "soft",
          },
        },
      ],
    },
  },
};

export function getDefaultStorefrontConfig(storeId: number) {
  return storefrontDefaults[storeId] ?? storefrontDefaults[storefrontDefaultAliases[storeId]];
}

export function getStorefrontConfigByTheme(theme?: string | null) {
  const normalizedTheme = theme?.trim().toLowerCase() ?? "";
  const presetStoreId =
    storefrontDefaultThemeIds[normalizedTheme as keyof typeof storefrontDefaultThemeIds];

  return presetStoreId ? storefrontDefaults[presetStoreId] : undefined;
}

export function getSafeStorefrontConfig(
  storeId: number,
  theme?: string | null,
): StorefrontTenantConfig {
  return (
    getDefaultStorefrontConfig(storeId) ??
    getStorefrontConfigByTheme(theme) ??
    safeEmptyStorefrontConfig
  );
}

