export async function getTenantConfig() {
  return {
    storeId: 1,
    theme: "minimal",

    pages: {
      home: [
        {
          type: "hero",
          props: {
            title: "Bienvenido a nuestra tienda",
            subtitle: "Los mejores productos online",
            buttonText: "Comprar ahora",
            buttonLink: "/collections/all",
            backgroundColor: "#f5f5f5",
            textColor: "black",
          },
        },

        {
          type: "banner",
          props: {
            text: "Envíos gratis en compras mayores a $50",
            backgroundColor: "black",
            textColor: "white",
          },
        },

        {
          type: "carousel",
          props: {
            title: "Destacados",
            limit: 6,
          },
        },

        {
          type: "category_grid",
          props: {
            title: "Explorar categorías",
            columns: 3,
          },
        },

        {
          type: "product_grid",
          props: {
            title: "Productos destacados",
            limit: 8,
            columns: 4,
          },
        },

        {
          type: "product_grid",
          props: {
            title: "Remeras",
            category: "remeras",
            limit: 4,
            columns: 2,
          },
        },

        {
          type: "featured_products",
          props: {
            title: "Productos destacados",
            limit: 3,
            columns: 3,
          },
        },

        {
          type: "testimonials",
          props: {
            title: "Lo que dicen nuestros clientes",
          },
        },

        {
          type: "newsletter",
          props: {
            title: "Suscribite a nuestro newsletter",
            subtitle: "Recibí ofertas y novedades",
          },
        },
      ],
    },
  };
}
