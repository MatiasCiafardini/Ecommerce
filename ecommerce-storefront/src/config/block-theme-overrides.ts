import type { ThemeBlockDefinition } from "@/types/block";

export const blockThemeOverrides: Record<
  string,
  Record<string, ThemeBlockDefinition | undefined>
> = {
  minimal: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para el street",
        editorialLabel: "Urban people",
        editorialTitle: "Editorial street energy",
      },
    },
  },
  trojani: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para el street",
        editorialLabel: "Urban people",
        editorialTitle: "Editorial street energy",
      },
    },
  },
  fashion: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para una silueta suave",
        editorialLabel: "Aurea edit",
        editorialTitle: "Texturas claras y capas que combinan sin esfuerzo",
      },
    },
  },
  mimaria: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para una silueta femenina y actual",
        editorialLabel: "Mi Maria edit",
        editorialTitle: "Prendas versatiles para vestir todos los dias con elegancia",
      },
    },
  },
  libreria: {
    product_grid: {
      defaultProps: {
        eyebrow: "Curado para el dia a dia",
        editorialLabel: "Papelera edit",
        editorialTitle: "Utiles, regalos, dulces y detalles para resolver una compra completa",
      },
    },
  },
};
