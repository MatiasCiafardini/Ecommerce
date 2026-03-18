export async function getTenantConfig() {
  return {
    storeId: 1,
    theme: "minimal",

    pages: {
      home: [
        {
          type: "hero",
          props: {
            title: "Streetwear para todos los dias",
            subtitle:
              "Remeras pesadas, buzos amplios y basicos con actitud urbana. Menos ruido, mas presencia.",
            buttonText: "Explorar catalogo",
            buttonLink: "/product",
            backgroundColor: "#161616",
            textColor: "white",
            animationPreset: "soft",
          },
        },

        {
          type: "banner",
          props: {
            text: "Drop nuevo disponible • envio gratis desde $120.000",
            backgroundColor: "#e9e3da",
            textColor: "#141414",
            animationPreset: "none",
          },
        },

        {
          type: "carousel",
          props: {
            title: "Lo mas buscado",
            limit: 6,
            animationPreset: "soft",
          },
        },

        {
          type: "category_grid",
          props: {
            title: "Explorar categorias",
            columns: 3,
            animationPreset: "soft",
          },
        },

        {
          type: "product_grid",
          props: {
            title: "Seleccion urbana",
            limit: 8,
            columns: 4,
            animationPreset: "soft",
          },
        },

        {
          type: "product_grid",
          props: {
            title: "Remeras para rotacion diaria",
            category: "remeras",
            limit: 4,
            columns: 2,
            animationPreset: "soft",
          },
        },

        {
          type: "featured_products",
          props: {
            title: "Piezas para combinar facil",
            limit: 3,
            columns: 3,
            animationPreset: "soft",
          },
        },

        {
          type: "testimonials",
          props: {
            title: "Feedback de la comunidad",
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
  };
}
