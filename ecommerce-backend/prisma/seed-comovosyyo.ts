import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizeEmail } from '../src/common/utils/email.util';

const prisma = new PrismaClient();
const STORE_ID = 7;

const storefrontConfig = {
  theme: 'comovosyyo',
  themePalette: {
    background: '#F5F1EA',
    backgroundSoft: '#F5F1EA',
    backgroundElevated: '#BFD5CF',
    paper: '#F5F1EA',
    paperMuted: '#BFD5CF',
    text: '#1A1A1A',
    textMuted: '#6E6E6E',
    textStrong: '#1A1A1A',
    border: 'rgba(26, 26, 26, 0.12)',
    borderStrong: '#73B5A5',
    accent: '#73B5A5',
    accentStrong: '#73B5A5',
    accentContrast: '#1A1A1A',
    pageShellBg: '#F5F1EA',
    storeShellBg: '#F5F1EA',
    pagePanelBg: '#F5F1EA',
    pagePanelStrongBg: '#BFD5CF',
    mutedFieldBg: '#F5F1EA',
    blockCardBg: '#F5F1EA',
    blockPanelBg: '#BFD5CF',
    testimonialCardBg: '#F5F1EA',
    testimonialCardFeaturedBg: '#BFD5CF',
    newsletterShellBg: '#BFD5CF',
  },
  pages: {
    home: [
      {
        type: 'hero_carousel',
        props: {
          showContentCard: false,
          buttonText: 'Ver coleccion',
          buttonLink: '/product',
          slides: [
            {
              image: '/images/comovosyyo/products/hero-comovosyyo.png',
              eyebrow: 'Como Vos y Yo',
              title: 'Moda femenina suave y actual',
              subtitle:
                'Prendas versatiles, tonos calmos y siluetas pensadas para combinar todos los dias.',
            },
          ],
          animationPreset: 'soft',
        },
      },
      {
        type: 'banner',
        props: {
          text: 'Coleccion capsula con envios a todo el pais y cambios simples',
          backgroundColor: '#BFD5CF',
          textColor: '#1A1A1A',
          animationPreset: 'none',
        },
      },
      {
        type: 'featured_products',
        props: {
          title: 'Destacados de la tienda',
          limit: 4,
          columns: 4,
          animationPreset: 'soft',
        },
      },
      {
        type: 'category_image_strip',
        props: {
          items: [
            {
              title: 'Remeras',
              image: '/images/comovosyyo/products/remera-basica.png',
              categorySlugs: ['remeras'],
            },
            {
              title: 'Camisas',
              image: '/images/comovosyyo/products/camisa-oversize-lino.png',
              categorySlugs: ['camisas'],
            },
            {
              title: 'Vestidos',
              image: '/images/comovosyyo/products/vestido-midi.png',
              categorySlugs: ['vestidos'],
            },
          ],
        },
      },
      {
        type: 'product_grid',
        props: {
          title: 'Nuevos ingresos',
          limit: 8,
          columns: 4,
          animationPreset: 'soft',
        },
      },
      {
        type: 'newsletter',
        props: {
          title: 'Recibi novedades de Como Vos y Yo',
          subtitle:
            'Suscribite para conocer nuevos ingresos, restocks y propuestas de temporada.',
          animationPreset: 'soft',
        },
      },
    ],
  },
} as const;

const categories = [
  { name: 'Remeras', slug: 'remeras', imageUrl: '/images/comovosyyo/products/remera-basica.png' },
  { name: 'Camisas', slug: 'camisas', imageUrl: '/images/comovosyyo/products/camisa-oversize-lino.png' },
  { name: 'Pantalones', slug: 'pantalones', imageUrl: '/images/comovosyyo/products/jean-wide-leg.png' },
  { name: 'Abrigos', slug: 'abrigos', imageUrl: '/images/comovosyyo/products/blazer-clasico.png' },
  { name: 'Vestidos', slug: 'vestidos', imageUrl: '/images/comovosyyo/products/vestido-midi.png' },
  { name: 'Accesorios', slug: 'accesorios', imageUrl: '/images/comovosyyo/products/tote-bag.png' },
] as const;

const products = [
  {
    title: 'Camisa oversize lino',
    slug: 'camisa-oversize-lino',
    description: 'Camisa liviana de lino con calce amplio y caida suave para looks relajados.',
    categorySlug: 'camisas',
    price: 64990,
    imageUrl: '/images/comovosyyo/products/camisa-oversize-lino.png',
    colors: ['Blanco', 'Beige'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Jean wide leg',
    slug: 'jean-wide-leg',
    description: 'Jean tiro alto de pierna amplia, ideal para combinar con basicos y sastreria.',
    categorySlug: 'pantalones',
    price: 78990,
    imageUrl: '/images/comovosyyo/products/jean-wide-leg.png',
    colors: ['Jean', 'Negro'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Chaleco sastrero',
    slug: 'chaleco-sastrero',
    description: 'Chaleco estructurado con linea limpia para sumar capas elegantes.',
    categorySlug: 'abrigos',
    price: 69990,
    imageUrl: '/images/comovosyyo/products/chaleco-sastrero.png',
    colors: ['Beige', 'Negro'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Sweater tejido',
    slug: 'sweater-tejido',
    description: 'Sweater suave de punto con textura delicada y calce relajado.',
    categorySlug: 'abrigos',
    price: 71990,
    imageUrl: '/images/comovosyyo/products/sweater-tejido.png',
    colors: ['Verde', 'Crudo'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Blazer clasico',
    slug: 'blazer-clasico',
    description: 'Blazer sastrero atemporal para elevar prendas simples de todos los dias.',
    categorySlug: 'abrigos',
    price: 98990,
    imageUrl: '/images/comovosyyo/products/blazer-clasico.png',
    colors: ['Negro', 'Chocolate'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Pantalon sastrero',
    slug: 'pantalon-sastrero',
    description: 'Pantalon de tiro alto con pinzas y caida elegante para oficina o salida.',
    categorySlug: 'pantalones',
    price: 82990,
    imageUrl: '/images/comovosyyo/products/pantalon-sastrero.png',
    colors: ['Chocolate', 'Negro'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Remera basica',
    slug: 'remera-basica',
    description: 'Remera de algodon suave, cuello redondo y calce comodo para todos los dias.',
    categorySlug: 'remeras',
    price: 32990,
    imageUrl: '/images/comovosyyo/products/remera-basica.png',
    colors: ['Blanco', 'Negro'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Buzo urbano',
    slug: 'buzo-urbano',
    description: 'Buzo relajado de frisa liviana para sumar abrigo sin perder prolijidad.',
    categorySlug: 'abrigos',
    price: 58990,
    imageUrl: '/images/comovosyyo/products/buzo-urbano.png',
    colors: ['Beige', 'Verde'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Vestido midi',
    slug: 'vestido-midi',
    description: 'Vestido midi de silueta fluida, femenino y facil de llevar.',
    categorySlug: 'vestidos',
    price: 84990,
    imageUrl: '/images/comovosyyo/products/vestido-midi.png',
    colors: ['Negro', 'Chocolate'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Campera de jean',
    slug: 'campera-de-jean',
    description: 'Campera denim clasica con lavado medio y estructura versatil.',
    categorySlug: 'abrigos',
    price: 89990,
    imageUrl: '/images/comovosyyo/products/campera-de-jean.png',
    colors: ['Jean', 'Negro'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Blusa satinada',
    slug: 'blusa-satinada',
    description: 'Blusa de caida suave con brillo sutil para looks mas arreglados.',
    categorySlug: 'camisas',
    price: 67990,
    imageUrl: '/images/comovosyyo/products/blusa-satinada.png',
    colors: ['Blanco', 'Chocolate'],
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    title: 'Tote bag',
    slug: 'tote-bag',
    description: 'Bolso amplio y estructurado para acompanar la rutina diaria.',
    categorySlug: 'accesorios',
    price: 45990,
    imageUrl: '/images/comovosyyo/products/tote-bag.png',
    colors: ['Beige', 'Chocolate'],
    sizes: ['Unico'],
  },
] as const;

function slugFragment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 3)
    .toUpperCase();
}

async function resetStoreCatalog(storeId: number) {
  const linkedOrderItems = await prisma.orderItem.count({
    where: {
      variant: {
        product: {
          storeId,
        },
      },
    },
  });

  if (linkedOrderItems > 0) {
    throw new Error(
      `Store ${storeId} has ${linkedOrderItems} order items linked to current products; refusing to delete catalog data.`,
    );
  }

  await prisma.inventory.deleteMany({ where: { storeId } });
  await prisma.productImage.deleteMany({ where: { product: { storeId } } });
  await prisma.productCategory.deleteMany({ where: { product: { storeId } } });
  await prisma.productOptionValue.deleteMany({ where: { product: { storeId } } });
  await prisma.productVariant.deleteMany({ where: { product: { storeId } } });
  await prisma.product.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
  await prisma.productOption.deleteMany({ where: { storeId } });
}

async function main() {
  const store = await prisma.store.findUnique({
    where: { id: STORE_ID },
    select: { id: true, name: true, domain: true },
  });

  if (!store || store.name !== 'Como Vos y Yo') {
    throw new Error(`Store ${STORE_ID} is not Como Vos y Yo; aborting.`);
  }

  await prisma.store.update({
    where: { id: STORE_ID },
    data: { storefrontConfig: storefrontConfig as any, manualSalesEnabled: true },
  });

  await resetStoreCatalog(STORE_ID);

  const createdCategories = await Promise.all(
    categories.map((category) =>
      prisma.category.create({
        data: {
          storeId: STORE_ID,
          ...category,
        },
      }),
    ),
  );
  const categoryBySlug = new Map(
    createdCategories.map((category) => [category.slug, category]),
  );

  const [sizeOption, colorOption] = await Promise.all([
    prisma.productOption.create({
      data: {
        storeId: STORE_ID,
        name: 'Talle',
      },
    }),
    prisma.productOption.create({
      data: {
        storeId: STORE_ID,
        name: 'Color',
      },
    }),
  ]);

  for (const [index, product] of products.entries()) {
    const category = categoryBySlug.get(product.categorySlug);
    if (!category) {
      throw new Error(`Missing category ${product.categorySlug}`);
    }

    const skuBase = `CVY-${String(index + 1).padStart(3, '0')}`;

    await prisma.product.create({
      data: {
        storeId: STORE_ID,
        title: product.title,
        slug: product.slug,
        description: product.description,
        published: true,
        categories: {
          create: [{ categoryId: category.id }],
        },
        images: {
          create: [{ url: product.imageUrl, position: 0 }],
        },
        optionValues: {
          create: [
            ...product.sizes.map((size) => ({
              productOptionId: sizeOption.id,
              value: size,
            })),
            ...product.colors.map((color) => ({
              productOptionId: colorOption.id,
              value: color,
            })),
          ],
        },
        variants: {
          create: product.colors.flatMap((color, colorIndex) =>
            product.sizes.map((size, sizeIndex) => ({
              sku: `${skuBase}-${slugFragment(color)}-${slugFragment(size)}`,
              price: product.price + colorIndex * 1500 + sizeIndex * 500,
              Size: size,
              Color: color,
              weight: product.categorySlug === 'accesorios' ? 0.6 : 0.72 + sizeIndex * 0.04,
              width: product.categorySlug === 'accesorios' ? 38 : 34 + sizeIndex,
              height: product.categorySlug === 'accesorios' ? 28 : 6 + colorIndex,
              length: product.categorySlug === 'accesorios' ? 14 : 28 + sizeIndex,
              inventories: {
                create: [
                  {
                    storeId: STORE_ID,
                    quantity: 8 + ((index + colorIndex + sizeIndex) % 6) * 2,
                    reserved: 0,
                  },
                ],
              },
            })),
          ),
        },
      },
    });
  }

  await prisma.user.upsert({
    where: {
      storeId_email: {
        storeId: STORE_ID,
        email: normalizeEmail('admin@comovosyyo.com'),
      },
    },
    update: {
      password: await bcrypt.hash('Admin123456!', 10),
      role: Role.ADMIN,
      name: 'Admin Como Vos y Yo',
    },
    create: {
      storeId: STORE_ID,
      email: normalizeEmail('admin@comovosyyo.com'),
      password: await bcrypt.hash('Admin123456!', 10),
      role: Role.ADMIN,
      name: 'Admin Como Vos y Yo',
    },
  });

  await prisma.customer.upsert({
    where: {
      storeId_email: {
        storeId: STORE_ID,
        email: normalizeEmail('cliente@comovosyyo.com'),
      },
    },
    update: {
      firstName: 'Cliente',
      lastName: 'Prueba',
      password: await bcrypt.hash('Cliente123456!', 10),
    },
    create: {
      storeId: STORE_ID,
      email: normalizeEmail('cliente@comovosyyo.com'),
      firstName: 'Cliente',
      lastName: 'Prueba',
      password: await bcrypt.hash('Cliente123456!', 10),
    },
  });

  console.log(
    JSON.stringify(
      {
        store,
        categories: categories.map(({ name, slug }) => ({ name, slug })),
        products: products.map(({ title, slug, categorySlug }) => ({
          title,
          slug,
          categorySlug,
        })),
        users: ['admin@comovosyyo.com', 'cliente@comovosyyo.com'],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
