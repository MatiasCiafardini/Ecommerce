import type {
  StorefrontFooterColumn,
  StorefrontNavLink,
  StorefrontThemeLayout,
} from "@/types/storefront-config";

const cloneLinks = (links: StorefrontNavLink[]): StorefrontNavLink[] =>
  links.map((link) => ({ ...link }));

const cloneColumns = (
  columns: StorefrontFooterColumn[],
): StorefrontFooterColumn[] =>
  columns.map((column) => ({
    title: column.title,
    links: cloneLinks(column.links),
  }));

const trojaniPrimaryLinks: StorefrontNavLink[] = [
  { href: "/product", label: "Shop" },
  { href: "/category/sale", label: "Sale" },
  { href: "/category/gift-cards", label: "Gift Cards" },
  { href: "/product/camiseta-argentina", label: "AFA" },
  { href: "/quienes-somos", label: "Quienes somos" },
];

const themeLayoutDefaults: Record<string, StorefrontThemeLayout> = {
  minimal: {
    header: {
      brandLabel: "Asphalt",
      primaryLinks: [
        { href: "/", label: "Inicio" },
        { href: "/product", label: "Drop" },
        { href: "/category/remeras", label: "Remeras" },
        { href: "/category/buzos", label: "Buzos" },
      ],
    },
    footer: {
      brandTitle: "Asphalt",
      brandSubtitle:
        "Streetwear con siluetas amplias, basicos limpios y drops pensados para la ciudad.",
      columns: [
        {
          title: "Explorar",
          links: [
            { href: "/product", label: "Catalogo" },
            { href: "/category/remeras", label: "Remeras" },
            { href: "/category/buzos", label: "Buzos" },
          ],
        },
        {
          title: "Cuenta",
          links: [
            { href: "/account", label: "Mi cuenta" },
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
          ],
        },
        {
          title: "Info",
          links: [],
        },
      ],
    },
  },
  trojani: {
    header: {
      brandLabel: "Trojani",
      primaryLinks: trojaniPrimaryLinks,
      announcementText:
        "3X2 / 10% OFF EN TRANSFERENCIA / ENVIO GRATIS A PARTIR DE $70.000",
    },
    footer: {
      brandTitle: "Trojani",
      brandSubtitle:
        "Streetwear con siluetas amplias, basicos limpios y drops pensados para la ciudad.",
      columns: [
        {
          title: "Explorar",
          links: [
            { href: "/product", label: "Catalogo" },
            { href: "/category/remeras", label: "Remeras" },
            { href: "/category/buzos", label: "Buzos" },
          ],
        },
        {
          title: "Cuenta",
          links: [
            { href: "/account", label: "Mi cuenta" },
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
          ],
        },
        {
          title: "Info",
          links: [],
        },
      ],
    },
  },
  fashion: {
    header: {
      brandLabel: "Aurea",
      primaryLinks: [
        { href: "/", label: "Inicio" },
        { href: "/product", label: "Coleccion" },
        { href: "/category/remeras", label: "Esenciales" },
        { href: "/category/buzos", label: "Abrigos" },
      ],
    },
    footer: {
      brandTitle: "Aurea",
      brandSubtitle:
        "Siluetas suaves, tonos crema y una seleccion pensada para vestir todos los dias con calma y presencia.",
      columns: [
        {
          title: "Explorar",
          links: [
            { href: "/product", label: "Coleccion" },
            { href: "/category/remeras", label: "Esenciales" },
            { href: "/category/buzos", label: "Abrigos" },
          ],
        },
        {
          title: "Cuenta",
          links: [
            { href: "/account", label: "Mi cuenta" },
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
          ],
        },
        {
          title: "Atencion",
          links: [],
        },
      ],
    },
  },
  libreria: {
    header: {
      brandLabel: "Libreria Papelera",
      primaryLinks: [
        { href: "/", label: "Inicio" },
        { href: "/product", label: "Catalogo" },
        { href: "/product", label: "Escolar" },
        { href: "/product", label: "Fiestas" },
      ],
    },
    footer: {
      brandTitle: "Libreria Papelera",
      brandSubtitle:
        "Libros, utiles escolares, golosinas y cotillon pensados para resolver compras rapidas, fechas especiales y vuelta al cole.",
      columns: [
        {
          title: "Explorar",
          links: [
            { href: "/product", label: "Catalogo" },
            { href: "/product", label: "Escolar" },
            { href: "/product", label: "Fiestas" },
          ],
        },
        {
          title: "Compra",
          links: [
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
            { href: "/account", label: "Mi cuenta" },
          ],
        },
        {
          title: "Atencion",
          links: [],
        },
      ],
    },
  },
  mimaria: {
    header: {
      brandLabel: "Mi Maria",
      primaryLinks: [
        { href: "/", label: "Inicio" },
        { href: "/product", label: "Coleccion" },
        { href: "/category/blusas", label: "Blusas" },
        { href: "/category/vestidos", label: "Vestidos" },
      ],
    },
    footer: {
      brandTitle: "Mi Maria",
      brandSubtitle:
        "Prendas femeninas casuales y elegantes, pensadas para acompanarte con delicadeza, comodidad y estilo todos los dias.",
      columns: [
        {
          title: "Comprar",
          links: [
            { href: "/product", label: "Coleccion completa" },
            { href: "/category/blusas", label: "Blusas" },
            { href: "/category/vestidos", label: "Vestidos" },
          ],
        },
        {
          title: "Ayuda",
          links: [
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
            { href: "/account", label: "Mi cuenta" },
          ],
        },
        {
          title: "Contacto",
          links: [
            { href: "https://instagram.com", label: "Instagram" },
            { href: "https://wa.me", label: "WhatsApp" },
            { href: "mailto:hola@mimaria.com", label: "hola@mimaria.com" },
          ],
        },
      ],
    },
  },
  milashoes: {
    header: {
      brandLabel: "Mila Shoes",
      announcementText:
        "ENVIO GRATIS A PARTIR DE $100.000 / 10% OFF EN TRANSFERENCIA / NUEVAS COLECCIONES",
      primaryLinks: [
        { href: "/product", label: "Shop" },
        { href: "/category/botas", label: "Botas" },
        { href: "/category/borcegos", label: "Borcegos" },
        { href: "/category/sneakers", label: "Sneakers" },
        { href: "/quienes-somos", label: "Quienes somos" },
        { href: "/guia-de-talles", label: "Guia de talles" },
      ],
    },
    footer: {
      brandTitle: "Mila Shoes",
      brandSubtitle:
        "Calzado femenino de lineas limpias, materiales nobles y una seleccion pensada para usar todos los dias.",
      columns: [
        {
          title: "Comprar",
          links: [
            { href: "/product", label: "Coleccion completa" },
            { href: "/category/botas", label: "Botas" },
            { href: "/category/sneakers", label: "Sneakers" },
          ],
        },
        {
          title: "Cuenta",
          links: [
            { href: "/account", label: "Mi cuenta" },
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
          ],
        },
        {
          title: "Contacto",
          links: [
            { href: "mailto:hola@milashoes.com", label: "hola@milashoes.com" },
            { href: "https://instagram.com", label: "Instagram" },
            { href: "https://wa.me", label: "WhatsApp" },
          ],
        },
      ],
    },
  },
  comovosyyo: {
    header: {
      brandLabel: "Como Vos y Yo",
      announcementText:
        "ENVIO GRATIS A PARTIR DE $100.000 / 10% OFF EN TRANSFERENCIA / NUEVAS COLECCIONES",
      primaryLinks: [
        { href: "/product", label: "Coleccion" },
        { href: "/category/remeras", label: "Remeras" },
        { href: "/category/camisas", label: "Camisas" },
        { href: "/category/vestidos", label: "Vestidos" },
        { href: "/quienes-somos", label: "Quienes somos" },
        { href: "/guia-de-talles", label: "Guia de talles" },
      ],
    },
    footer: {
      brandTitle: "Como Vos y Yo",
      brandSubtitle:
        "Moda femenina elegante, limpia y actual para una boutique minimalista con mirada premium.",
      columns: [
        {
          title: "Comprar",
          links: [
            { href: "/product", label: "Coleccion completa" },
            { href: "/category/remeras", label: "Remeras" },
            { href: "/category/camisas", label: "Camisas" },
            { href: "/category/vestidos", label: "Vestidos" },
          ],
        },
        {
          title: "Cuenta",
          links: [
            { href: "/account", label: "Mi cuenta" },
            { href: "/cart", label: "Carrito" },
            { href: "/checkout", label: "Checkout" },
          ],
        },
        {
          title: "Contacto",
          links: [
            { href: "mailto:hola@comovosyyo.com", label: "hola@comovosyyo.com" },
            { href: "https://www.instagram.com/comovosyyo_", label: "Instagram" },
            { href: "https://wa.me/5492326494545", label: "WhatsApp" },
          ],
        },
      ],
    },
  },
};

export function getDefaultThemeLayout(
  theme?: string | null,
): StorefrontThemeLayout {
  const normalized = theme?.trim().toLowerCase() ?? "";
  const base = themeLayoutDefaults[normalized] ?? themeLayoutDefaults.minimal;

  return {
    header: base.header
      ? {
          brandLabel: base.header.brandLabel,
          announcementText: base.header.announcementText,
          primaryLinks: cloneLinks(base.header.primaryLinks ?? []),
        }
      : undefined,
    footer: base.footer
      ? {
          brandTitle: base.footer.brandTitle,
          brandSubtitle: base.footer.brandSubtitle,
          columns: cloneColumns(base.footer.columns ?? []),
        }
      : undefined,
  };
}

export function mergeThemeLayout(
  theme: string | null | undefined,
  layout?: StorefrontThemeLayout | null,
) {
  const fallback = getDefaultThemeLayout(theme);
  const normalizedTheme = theme?.trim().toLowerCase() ?? "";
  const headerLinks =
    normalizedTheme === "trojani"
      ? trojaniPrimaryLinks
      : Array.isArray(layout?.header?.primaryLinks) &&
          layout.header.primaryLinks.length > 0
        ? layout.header.primaryLinks
        : (fallback.header?.primaryLinks ?? []);
  const footerColumns =
    Array.isArray(layout?.footer?.columns) && layout.footer.columns.length > 0
      ? layout.footer.columns
      : (fallback.footer?.columns ?? []);

  return {
    header: {
      brandLabel:
        layout?.header?.brandLabel?.trim() || fallback.header?.brandLabel || "",
      announcementText:
        layout?.header?.announcementText?.trim() ||
        fallback.header?.announcementText ||
        "",
      primaryLinks: cloneLinks(
        headerLinks.filter(
          (link): link is StorefrontNavLink =>
            Boolean(link?.label?.trim()) && Boolean(link?.href?.trim()),
        ),
      ),
    },
    footer: {
      brandTitle:
        layout?.footer?.brandTitle?.trim() || fallback.footer?.brandTitle || "",
      brandSubtitle:
        layout?.footer?.brandSubtitle?.trim() ||
        fallback.footer?.brandSubtitle ||
        "",
      columns: cloneColumns(
        footerColumns
          .map((column) => ({
            title: column.title?.trim() || "",
            links: (column.links ?? []).filter(
              (link): link is StorefrontNavLink =>
                Boolean(link?.label?.trim()) && Boolean(link?.href?.trim()),
            ),
          }))
          .filter((column) => column.title || column.links.length > 0),
      ),
    },
  } satisfies StorefrontThemeLayout;
}
