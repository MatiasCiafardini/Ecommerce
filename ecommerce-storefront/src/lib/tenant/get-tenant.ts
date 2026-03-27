import { headers } from "next/headers";
import { resolveStoreIdFromHost } from "@/lib/tenant/store-context";
import { Block } from "@/types/block";

type StorefrontTenantConfig = {
  theme: string;
  pages: {
    home: Block[];
  };
};

const storeConfigs: Record<number, StorefrontTenantConfig> = {
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
            text: "Drop nuevo activo • compra hoy y defini tu entrega en el checkout",
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
        {
          type: "testimonials",
          props: {
            animationPreset: "soft",
          },
        },
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
                subtitle: "Aprovechá a comprar ahora!",
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
                subtitle: "Banners de novedad pensados para entrar por imagen.",
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
          type: "category_grid",
          props: {
            title: "Explora por silueta",
            columns: 3,
            animationPreset: "soft",
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
        {
          type: "testimonials",
          props: {
            animationPreset: "soft",
          },
        },
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
                subtitle: "Aprovechá a comprar ahora!",
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
                subtitle: "Banners de novedad pensados para entrar por imagen.",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Drop nuevo activo, compra hoy y defini tu entrega en el checkout",
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
        {
          type: "testimonials",
          props: {
            animationPreset: "soft",
          },
        },
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
                  "La home ahora esta pensada para una tienda mixta con cuadernos, lapices, kits escolares y espacio para reemplazar estos fondos por imagenes propias.",
              },
              {
                image: "/images/libreria/fondo_banner2.jpeg",
                eyebrow: "Libros y regalos",
                title: "Articulos para regalar todo el año",
                subtitle:
                  "Dejamos un bloque hero mas comercial, menos editorial puro, para que convivan lectura, regaleria y compras impulsivas.",
              },
              {
                image: "/images/libreria/fondo_banner1.jpeg",
                eyebrow: "Fiestas y antojos",
                title: "Cotillon, golosinas y extras para resolver rapido",
                subtitle:
                  "La tienda 4 ya no esta armada como libreria pura: ahora mezcla utiles, candy y deco infantil para funcionar como boceto mas realista.",
              },
            ],
            animationPreset: "soft",
          },
        },
        {
          type: "banner",
          props: {
            text: "Store 4 orientada a papeleria: libros, utiles escolares, golosinas y cotillon con paleta rosa pastel y fondos reemplazables",
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
            editorialTitle: "Globos, mesas dulces y combos para cumpleanos",
            animationPreset: "soft",
          },
        },
        {
          type: "newsletter",
          props: {
            title: "Recibi novedades de la tienda",
            subtitle:
              "Sirve para anunciar ingresos escolares, promos de golosinas, fechas especiales y combos de cotillon.",
            animationPreset: "soft",
          },
        },
      ],
    },
  },
};

export async function getTenantConfig() {
  const requestHeaders = await headers();
  const storeId = resolveStoreIdFromHost(requestHeaders.get("host"));
  const config = storeConfigs[storeId as keyof typeof storeConfigs];

  if (!config) {
    throw new Error(`Missing storefront page config for store ${storeId}`);
  }

  return {
    storeId,
    theme: config.theme,
    pages: config.pages,
  };
}
