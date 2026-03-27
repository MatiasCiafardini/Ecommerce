import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  PAPERERIA_CATEGORIES,
  PAPERERIA_PRODUCTS,
} from './papereria-catalog';

const prisma = new PrismaClient();

const DEVELOPMENT_STORES = [
  {
    id: 1,
    name: 'Demo Store',
    domain: 'localhost:3001',
    adminEmail: 'admin@demo.com',
  },
  {
    id: 2,
    name: 'Demo Store 2',
    domain: 'localhost:3002',
    adminEmail: 'admin-store2@demo.com',
  },
  {
    id: 4,
    name: 'Demo Store 4',
    domain: 'localhost:3004',
    adminEmail: 'admin-store4@demo.com',
  },
] as const;

type DevelopmentStoreRecord = {
  id: number;
  name: string;
  domain: string;
  adminEmail: string;
};

function readStoreEnvCredential(storeId: number, key: "ACCESS_TOKEN" | "PUBLIC_KEY") {
  return process.env[`STORE_${storeId}_MERCADOPAGO_${key}`]?.trim() || null;
}

const CATEGORY_DEFINITIONS = [
  {
    name: 'Remeras',
    singular: 'Remera',
    slug: 'remeras',
    kind: 'tee' as const,
    titles: ['Asphalt', 'Block Seam', 'Tunnel Print', 'Signal', 'Concrete', 'Metro', 'Night Shift', 'Echo', 'Outline', 'District'],
    fits: ['oversized', 'boxy', 'relaxed', 'heavy fit'],
  },
  {
    name: 'Buzos',
    singular: 'Buzo',
    slug: 'buzos',
    kind: 'hoodie' as const,
    titles: ['Core Hood', 'Static Crew', 'Grey Pulse', 'Layer Club', 'Afterlight', 'Shadow', 'Street Loop', 'Northline', 'Raw', 'Transit'],
    fits: ['oversized', 'relaxed', 'drop shoulder', 'street fit'],
  },
  {
    name: 'Camperas',
    singular: 'Campera',
    slug: 'camperas',
    kind: 'jacket' as const,
    titles: ['Transit Shell', 'Night Utility', 'Concrete Wind', 'Metro Guard', 'Echo Layer', 'Block Armor', 'Rooftop', 'Axis', 'District Shell', 'Signal Guard'],
    fits: ['boxy', 'cropped', 'oversized', 'utility fit'],
  },
  {
    name: 'Pantalones',
    singular: 'Pantalon',
    slug: 'pantalones',
    kind: 'pants' as const,
    titles: ['Studio Pant', 'Rooftop Pant', 'Lane Straight', 'Asphalt Pant', 'Grey Motion', 'Shift Pant', 'Core Tailor', 'Layer Pant', 'Transit Pant', 'Signal Pant'],
    fits: ['relaxed', 'straight', 'wide leg', 'tailored relaxed'],
  },
  {
    name: 'Cargos',
    singular: 'Cargo',
    slug: 'cargos',
    kind: 'cargo' as const,
    titles: ['Cargo Unit', 'Block Cargo', 'Metro Pocket', 'Night Cargo', 'District Utility', 'Concrete Cargo', 'Transit Cargo', 'Axis Cargo', 'Rooftop Cargo', 'Heavy Cargo'],
    fits: ['wide leg', 'straight', 'relaxed cargo', 'utility fit'],
  },
  {
    name: 'Joggers',
    singular: 'Jogger',
    slug: 'joggers',
    kind: 'jogger' as const,
    titles: ['Core Jogger', 'Shift Jogger', 'Soft Motion', 'Echo Jogger', 'Track Street', 'Signal Jogger', 'Concrete Jogger', 'Daily Jogger', 'Night Jogger', 'Transit Jogger'],
    fits: ['relaxed cuffed', 'street tapered', 'oversized cuffed', 'soft relaxed'],
  },
  {
    name: 'Camisas',
    singular: 'Camisa',
    slug: 'camisas',
    kind: 'shirt' as const,
    titles: ['Layer Shirt', 'Grid Shirt', 'Night Oxford', 'Block Shirt', 'Concrete Stripe', 'Rooftop Shirt', 'Transit Shirt', 'Static Shirt', 'Axis Shirt', 'Daily Shirt'],
    fits: ['boxy', 'relaxed', 'overshirt', 'regular relaxed'],
  },
  {
    name: 'Shorts',
    singular: 'Short',
    slug: 'shorts',
    kind: 'shorts' as const,
    titles: ['Core Short', 'Transit Short', 'Night Mesh', 'District Short', 'Track Short', 'Signal Short', 'Concrete Short', 'Street Short', 'Axis Short', 'Grey Short'],
    fits: ['relaxed', 'sport fit', 'wide short', 'street relaxed'],
  },
  {
    name: 'Chalecos',
    singular: 'Chaleco',
    slug: 'chalecos',
    kind: 'vest' as const,
    titles: ['Utility Vest', 'Signal Vest', 'Block Vest', 'Transit Vest', 'Layer Vest', 'Concrete Vest', 'Street Vest', 'Night Vest', 'Axis Vest', 'Rooftop Vest'],
    fits: ['boxy', 'utility fit', 'oversized', 'street layered'],
  },
  {
    name: 'Accesorios',
    singular: 'Accesorio',
    slug: 'accesorios',
    kind: 'accessory' as const,
    titles: ['Core Cap', 'Signal Beanie', 'Transit Bag', 'Street Tote', 'Metro Cap', 'Concrete Beanie', 'Axis Bag', 'Night Tote', 'Daily Cap', 'District Bag'],
    fits: ['street essential', 'daily carry', 'urban layer', 'everyday accessory'],
  },
] as const;

const COLLECTIONS = [
  'Asphalt Core',
  'Night Shift',
  'Concrete Echo',
  'Metro Layer',
  'Signal Wear',
  'Rooftop Uniform',
  'District Motion',
  'Tunnel Club',
  'Northline',
  'Grey Matter',
] as const;

const SIZE_MAP: Record<string, string[]> = {
  tee: ['S', 'M', 'L', 'XL'],
  hoodie: ['M', 'L', 'XL'],
  jacket: ['M', 'L', 'XL'],
  pants: ['38', '40', '42', '44'],
  cargo: ['38', '40', '42', '44'],
  jogger: ['S', 'M', 'L', 'XL'],
  shirt: ['S', 'M', 'L', 'XL'],
  shorts: ['S', 'M', 'L', 'XL'],
  vest: ['M', 'L', 'XL'],
  accessory: ['Unico'],
};

const COLOR_GROUPS = [
  ['Negro', 'Gris grafito'],
  ['Oliva', 'Arena'],
  ['Crudo', 'Negro'],
  ['Bordo', 'Negro'],
  ['Azul petroleo', 'Gris humo'],
  ['Chocolate', 'Arena'],
] as const;

const PALETTES = [
  { base: '#121212', accent: '#f2eee8', support: '#8e6d54', glow: '#d9c7b2' },
  { base: '#17191d', accent: '#f0ece5', support: '#6b7a8f', glow: '#bcc8d8' },
  { base: '#141410', accent: '#f1ebdf', support: '#8a7557', glow: '#d6c0a0' },
  { base: '#171316', accent: '#f4ede7', support: '#814f56', glow: '#d6b0b6' },
  { base: '#0f1717', accent: '#f0efe8', support: '#43636b', glow: '#97b5bb' },
  { base: '#161313', accent: '#f5ece3', support: '#70534a', glow: '#caa696' },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function productDescription(args: {
  collection: string;
  categoryName: string;
  fit: string;
  colors: readonly string[];
}) {
  return `${args.categoryName} de la coleccion ${args.collection}, pensada para un look urbano actual. Calce ${args.fit}, terminacion premium y paleta ${args.colors.join(' / ')} para rotacion diaria en tienda de prueba.`;
}

function productPrice(kind: string, index: number) {
  const baseMap = {
    tee: 32990,
    hoodie: 69990,
    jacket: 89990,
    pants: 64990,
    cargo: 72990,
    jogger: 58990,
    shirt: 55990,
    shorts: 42990,
    vest: 61990,
    accessory: 19990,
  } as const;

  const base = baseMap[kind as keyof typeof baseMap] ?? 32990;

  return base + (index % 5) * 2500;
}

function inventoryQuantity(index: number, colorIndex: number, sizeIndex: number) {
  return 4 + ((index + colorIndex + sizeIndex) % 9) * 2;
}

function shapeMarkup(kind: string, accent: string, support: string, glow: string) {
  switch (kind) {
    case 'tee':
      return `
        <path d="M290 180l72-38 38 44 38-44 72 38-32 74-42-16v228H332V238l-42 16z" fill="${accent}" />
        <path d="M332 238c48 12 92 12 134 0v228H332z" fill="${glow}" opacity="0.22" />
      `;
    case 'hoodie':
      return `
        <path d="M356 148c12-18 28-28 44-28s32 10 44 28l18 34-18 26h-88l-18-26z" fill="${support}" />
        <path d="M286 224l64-30h100l64 30-32 68-32-12v198H350V280l-32 12z" fill="${accent}" />
        <rect x="382" y="330" width="36" height="82" rx="18" fill="${support}" opacity="0.48" />
      `;
    case 'jacket':
      return `
        <path d="M306 174l84-40 30 38 30-38 84 40-26 78-40-18v252H332V234l-40 18z" fill="${accent}" />
        <rect x="395" y="170" width="10" height="316" rx="5" fill="${support}" />
        <rect x="342" y="300" width="34" height="56" rx="10" fill="${support}" opacity="0.4" />
        <rect x="424" y="300" width="34" height="56" rx="10" fill="${support}" opacity="0.4" />
      `;
    case 'pants':
      return `
        <path d="M344 148h152l-12 138-34 210h-56l-16-146-16 146h-56l-34-210z" fill="${accent}" />
        <path d="M396 148v132m48-132v132" stroke="${support}" stroke-width="8" opacity="0.45" />
      `;
    case 'cargo':
      return `
        <path d="M340 148h160l-14 130-28 218h-56l-10-122-10 122h-56l-28-218z" fill="${accent}" />
        <rect x="330" y="286" width="42" height="60" rx="10" fill="${support}" opacity="0.36" />
        <rect x="468" y="286" width="42" height="60" rx="10" fill="${support}" opacity="0.36" />
      `;
    case 'jogger':
      return `
        <path d="M344 148h152l-16 148-20 176c-2 18-18 32-36 32h-8l-12-118-12 118h-8c-18 0-34-14-36-32l-20-176z" fill="${accent}" />
        <rect x="350" y="468" width="42" height="18" rx="9" fill="${support}" />
        <rect x="448" y="468" width="42" height="18" rx="9" fill="${support}" />
      `;
    case 'shirt':
      return `
        <path d="M308 178l82-44 26 32 26-32 82 44-26 70-34-18v256H336V230l-34 18z" fill="${accent}" />
        <rect x="395" y="170" width="10" height="316" rx="5" fill="${support}" />
        <path d="M356 198h88" stroke="${support}" stroke-width="8" opacity="0.45" />
      `;
    case 'shorts':
      return `
        <path d="M344 148h152l-18 110-18 128h-46l-18-92-18 92h-46l-18-128z" fill="${accent}" />
        <path d="M396 148v90m48-90v90" stroke="${support}" stroke-width="8" opacity="0.45" />
      `;
    case 'vest':
      return `
        <path d="M332 164l82-34 82 34-22 322H332z" fill="${accent}" />
        <rect x="395" y="164" width="10" height="322" rx="5" fill="${support}" />
        <rect x="352" y="286" width="38" height="68" rx="10" fill="${support}" opacity="0.38" />
        <rect x="410" y="286" width="38" height="68" rx="10" fill="${support}" opacity="0.38" />
      `;
    case 'accessory':
      return `
        <path d="M324 256c0-58 44-100 108-100s108 42 108 100v44H324z" fill="${accent}" />
        <rect x="296" y="300" width="272" height="28" rx="14" fill="${support}" />
        <path d="M352 374h160v64H352z" fill="${glow}" opacity="0.18" />
      `;
    default:
      return '';
  }
}

function buildSvg(args: {
  title: string;
  subtitle: string;
  kind: string;
  palette: (typeof PALETTES)[number];
  detail: string;
}) {
  const { base, accent, support, glow } = args.palette;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 800 1066" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${base}" />
        <stop offset="55%" stop-color="${support}" />
        <stop offset="100%" stop-color="${glow}" />
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.14)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
      </linearGradient>
    </defs>
    <rect width="800" height="1066" rx="44" fill="url(#bg)" />
    <g opacity="0.12" stroke="#f3eee7" stroke-width="2">
      <path d="M0 150h800" />
      <path d="M0 330h800" />
      <path d="M0 510h800" />
      <path d="M0 690h800" />
      <path d="M0 870h800" />
      <path d="M140 0v1066" />
      <path d="M320 0v1066" />
      <path d="M500 0v1066" />
      <path d="M680 0v1066" />
    </g>
    <circle cx="634" cy="186" r="132" fill="#ffffff" opacity="0.07" />
    <rect x="72" y="72" width="656" height="922" rx="36" fill="#0f0f0f" fill-opacity="0.22" stroke="rgba(255,255,255,0.14)" />
    <text x="92" y="118" fill="#f3eee7" font-size="22" font-family="Arial, sans-serif" letter-spacing="6">ASPHALT TEST LAB</text>
    <text x="92" y="902" fill="#f3eee7" font-size="48" font-weight="700" font-family="Arial, sans-serif">${escapeXml(args.title)}</text>
    <text x="92" y="944" fill="rgba(243,238,231,0.82)" font-size="20" font-family="Arial, sans-serif">${escapeXml(args.subtitle)}</text>
    <text x="92" y="980" fill="rgba(243,238,231,0.72)" font-size="18" font-family="Arial, sans-serif">${escapeXml(args.detail)}</text>
    <g transform="translate(0 80)">
      ${shapeMarkup(args.kind, accent, support, glow)}
    </g>
    <rect x="92" y="130" width="170" height="38" rx="19" fill="#111111" fill-opacity="0.32" stroke="rgba(255,255,255,0.16)" />
    <text x="118" y="154" fill="#f3eee7" font-size="16" font-family="Arial, sans-serif" letter-spacing="3">URBAN TEST DROP</text>
  </svg>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function ensureAssetDir() {
  const assetBaseDir = path.resolve(
    __dirname,
    '..',
    '..',
    'ecommerce-storefront',
    'public',
    'images',
  );

  const catalogDir = path.join(assetBaseDir, 'seed-catalog');
  const categoryDir = path.join(assetBaseDir, 'seed-categories');

  await fs.rm(catalogDir, { recursive: true, force: true });
  await fs.rm(categoryDir, { recursive: true, force: true });
  await fs.mkdir(catalogDir, { recursive: true });
  await fs.mkdir(categoryDir, { recursive: true });

  return { catalogDir, categoryDir };
}

function buildCategorySvg(args: {
  title: string;
  palette: (typeof PALETTES)[number];
  collection: string;
}) {
  const { base, accent, support, glow } = args.palette;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${base}" />
        <stop offset="55%" stop-color="${support}" />
        <stop offset="100%" stop-color="${glow}" />
      </linearGradient>
    </defs>
    <rect width="1600" height="900" rx="36" fill="url(#bg)" />
    <g opacity="0.12" stroke="#f3eee7" stroke-width="2">
      <path d="M0 160h1600" />
      <path d="M0 320h1600" />
      <path d="M0 480h1600" />
      <path d="M0 640h1600" />
      <path d="M180 0v900" />
      <path d="M500 0v900" />
      <path d="M820 0v900" />
      <path d="M1140 0v900" />
      <path d="M1460 0v900" />
    </g>
    <circle cx="1260" cy="180" r="150" fill="#ffffff" opacity="0.07" />
    <rect x="90" y="90" width="1420" height="720" rx="30" fill="#0f0f0f" fill-opacity="0.18" stroke="rgba(255,255,255,0.14)" />
    <text x="130" y="180" fill="#f3eee7" font-size="30" font-family="Arial, sans-serif" letter-spacing="10">ASPHALT CATEGORY</text>
    <text x="130" y="600" fill="#ffffff" font-size="96" font-weight="700" font-family="Arial, sans-serif">${escapeXml(args.title.toUpperCase())}</text>
    <text x="130" y="660" fill="rgba(243,238,231,0.8)" font-size="28" font-family="Arial, sans-serif">${escapeXml(args.collection)}</text>
    <rect x="1060" y="240" width="280" height="280" rx="36" fill="${accent}" fill-opacity="0.9" />
    <rect x="1180" y="180" width="240" height="380" rx="42" fill="${glow}" fill-opacity="0.28" />
    <rect x="980" y="320" width="220" height="220" rx="32" fill="${support}" fill-opacity="0.32" />
  </svg>`;
}

async function resetCatalogData(storeId: number) {
  await prisma.refund.deleteMany({ where: { storeId } });
  await prisma.returnItem.deleteMany({
    where: {
      return: {
        storeId,
      },
    },
  });
  await prisma.return.deleteMany({ where: { storeId } });
  await prisma.shipmentTrackingEvent.deleteMany({
    where: {
      shipment: {
        storeId,
      },
    },
  });
  await prisma.shipment.deleteMany({ where: { storeId } });
  await prisma.payment.deleteMany({ where: { storeId } });
  await prisma.cancellationRequest.deleteMany({ where: { storeId } });
  await prisma.orderItem.deleteMany({
    where: {
      order: {
        storeId,
      },
    },
  });
  await prisma.order.deleteMany({ where: { storeId } });
  await prisma.cartItem.deleteMany({
    where: {
      cart: {
        storeId,
      },
    },
  });
  await prisma.cart.deleteMany({ where: { storeId } });
  await prisma.shippingQuote.deleteMany({ where: { storeId } });
  await prisma.inventory.deleteMany({ where: { storeId } });
  await prisma.productImage.deleteMany({
    where: {
      product: {
        storeId,
      },
    },
  });
  await prisma.productCategory.deleteMany({
    where: {
      product: {
        storeId,
      },
    },
  });
  await prisma.productOptionValue.deleteMany({
    where: {
      product: {
        storeId,
      },
    },
  });
  await prisma.productVariant.deleteMany({
    where: {
      product: {
        storeId,
      },
    },
  });
  await prisma.product.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
  await prisma.productOption.deleteMany({ where: { storeId } });
}

async function ensureDevelopmentStores() {
  const stores: DevelopmentStoreRecord[] = [];

  for (const definition of DEVELOPMENT_STORES) {
    const existing = await prisma.store.findUnique({
      where: {
        id: definition.id,
      },
    });

    const store = existing
      ? await prisma.store.update({
          where: { id: definition.id },
          data: {
            name: definition.name,
            domain: definition.domain,
            mercadoPagoAccessToken: readStoreEnvCredential(definition.id, "ACCESS_TOKEN"),
            mercadoPagoPublicKey: readStoreEnvCredential(definition.id, "PUBLIC_KEY"),
          },
        })
      : await prisma.store.create({
          data: {
            id: definition.id,
            name: definition.name,
            domain: definition.domain,
            mercadoPagoAccessToken: readStoreEnvCredential(definition.id, "ACCESS_TOKEN"),
            mercadoPagoPublicKey: readStoreEnvCredential(definition.id, "PUBLIC_KEY"),
          },
        });

    stores.push({
      ...store,
      adminEmail: definition.adminEmail,
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Store"', 'id'), COALESCE((SELECT MAX(id) FROM "Store"), 1))`,
  );

  return stores;
}

async function ensureAdmin(storeId: number, email: string) {
  const password = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: {
      storeId_email: {
        storeId,
        email,
      },
    },
    update: {
      role: Role.OWNER,
      name: 'Admin',
      password,
    },
    create: {
      email,
      password,
      name: 'Admin',
      role: Role.OWNER,
      storeId,
    },
  });
}

async function seedCatalog(
  storeId: number,
  assetDirs: Awaited<ReturnType<typeof ensureAssetDir>>,
) {
  const { catalogDir, categoryDir } = assetDirs;
  const categories = await Promise.all(
    CATEGORY_DEFINITIONS.map(async (definition, index) => {
      const categoryImageName = `${definition.slug}.svg`;
      await fs.writeFile(
        path.join(categoryDir, categoryImageName),
        buildCategorySvg({
          title: definition.name,
          palette: PALETTES[index % PALETTES.length],
          collection: COLLECTIONS[index % COLLECTIONS.length],
        }),
        'utf8',
      );

      return prisma.category.create({
        data: {
          storeId,
          name: definition.name,
          slug: definition.slug,
          imageUrl: `/images/seed-categories/${categoryImageName}`,
        },
      });
    }),
  );

  const sizeOption = await prisma.productOption.create({
    data: {
      storeId,
      name: 'Talle',
    },
  });

  const colorOption = await prisma.productOption.create({
    data: {
      storeId,
      name: 'Color',
    },
  });

  let globalIndex = 0;

  for (const [categoryIndex, definition] of CATEGORY_DEFINITIONS.entries()) {
    const category = categories[categoryIndex];

    for (const [titleIndex, shortTitle] of definition.titles.entries()) {
      globalIndex += 1;

      const collection = COLLECTIONS[(globalIndex - 1) % COLLECTIONS.length];
      const fit = definition.fits[(globalIndex - 1) % definition.fits.length];
      const palette = PALETTES[(globalIndex - 1) % PALETTES.length];
      const colorPair = COLOR_GROUPS[(globalIndex - 1) % COLOR_GROUPS.length];
      const sizes = SIZE_MAP[definition.kind];
      const title = `${definition.singular} ${shortTitle} ${collection}`.replace(
        /\s+/g,
        ' ',
      );
      const slug = `${slugify(title)}-${globalIndex}`;
      const skuBase = `S${storeId}-${definition.slug.slice(0, 3).toUpperCase()}-${String(
        globalIndex,
      ).padStart(3, '0')}`;

      const frontImageName = `${slug}-front.svg`;
      const detailImageName = `${slug}-detail.svg`;

      await Promise.all([
        fs.writeFile(
          path.join(catalogDir, frontImageName),
          buildSvg({
            title,
            subtitle: collection,
            kind: definition.kind,
            palette,
            detail: `${definition.name} · ${fit} · ${colorPair.join(' / ')}`,
          }),
          'utf8',
        ),
        fs.writeFile(
          path.join(catalogDir, detailImageName),
          buildSvg({
            title: `${shortTitle} Detail`,
            subtitle: 'Urban catalog asset',
            kind: definition.kind,
            palette: PALETTES[(globalIndex + 1) % PALETTES.length],
            detail: `SKU ${skuBase} · test image`,
          }),
          'utf8',
        ),
      ]);

      const price = productPrice(definition.kind, globalIndex);

      await prisma.product.create({
        data: {
          storeId,
          title,
          slug,
          description: productDescription({
            collection,
            categoryName: definition.name,
            fit,
            colors: colorPair,
          }),
          published: true,
          categories: {
            create: [
              {
                categoryId: category.id,
              },
            ],
          },
          images: {
            create: [
              {
                url: `/images/seed-catalog/${frontImageName}`,
                position: 0,
              },
              {
                url: `/images/seed-catalog/${detailImageName}`,
                position: 1,
              },
            ],
          },
          optionValues: {
            create: [
              ...sizes.map((size) => ({
                productOptionId: sizeOption.id,
                value: size,
              })),
              ...colorPair.map((color) => ({
                productOptionId: colorOption.id,
                value: color,
              })),
            ],
          },
          variants: {
            create: colorPair.flatMap((color, colorIndex) =>
              sizes.map((size, sizeIndex) => ({
                sku: `${skuBase}-${slugify(color).slice(0, 3).toUpperCase()}-${slugify(
                  size,
                ).toUpperCase()}`,
                price: price + colorIndex * 1500 + sizeIndex * 500,
                Size: size,
                Color: color,
                weight: definition.kind === 'accessory' ? 0.35 : 0.72 + sizeIndex * 0.08,
                width: definition.kind === 'accessory' ? 22 : 36 + sizeIndex,
                height: definition.kind === 'accessory' ? 12 : 8 + colorIndex,
                length: definition.kind === 'accessory' ? 18 : 28 + sizeIndex,
                inventories: {
                  create: [
                    {
                      storeId,
                      quantity: inventoryQuantity(globalIndex, colorIndex, sizeIndex),
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
  }
}

async function seedPapereriaCatalog(storeId: number) {
  const categories = await Promise.all(
    PAPERERIA_CATEGORIES.map((category) =>
      prisma.category.create({
        data: {
          storeId,
          name: category.name,
          slug: category.slug,
          imageUrl: category.imageUrl,
        },
      }),
    ),
  );

  const categoriesBySlug = new Map(
    categories.map((category) => [category.slug, category] as const),
  );

  const presentationOption = await prisma.productOption.create({
    data: {
      storeId,
      name: 'Presentacion',
    },
  });

  const colorOption = await prisma.productOption.create({
    data: {
      storeId,
      name: 'Color',
    },
  });

  for (const [index, product] of PAPERERIA_PRODUCTS.entries()) {
    const category = categoriesBySlug.get(product.categorySlug);

    if (!category) {
      throw new Error(
        `Missing papereria category ${product.categorySlug} for ${product.slug}`,
      );
    }

    const skuBase = `S${storeId}-${product.categorySlug
      .slice(0, 3)
      .toUpperCase()}-${String(index + 1).padStart(3, '0')}`;

    await prisma.product.create({
      data: {
        storeId,
        title: product.title,
        slug: product.slug,
        description: product.description,
        published: true,
        categories: {
          create: [
            {
              categoryId: category.id,
            },
          ],
        },
        images: {
          create: product.imageUrls.map((url, position) => ({
            url,
            position,
          })),
        },
        optionValues: {
          create: [
            ...product.presentations.map((presentation) => ({
              productOptionId: presentationOption.id,
              value: presentation,
            })),
            ...product.colors.map((color) => ({
              productOptionId: colorOption.id,
              value: color,
            })),
          ],
        },
        variants: {
          create: product.colors.flatMap((color, colorIndex) =>
            product.presentations.map((presentation, presentationIndex) => ({
              sku: `${skuBase}-${slugify(color).slice(0, 3).toUpperCase()}-${slugify(
                presentation,
              )
                .slice(0, 5)
                .toUpperCase()}`,
              price:
                product.price + presentationIndex * 900 + colorIndex * 350,
              Size: presentation,
              Color: color,
              weight: product.weight,
              width: product.width,
              height: product.height,
              length: product.length,
              inventories: {
                create: [
                  {
                    storeId,
                    quantity: 6 + ((index + colorIndex + presentationIndex) % 8) * 3,
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
}

async function main() {
  const stores = await ensureDevelopmentStores();
  const assetDirs = await ensureAssetDir();

  for (const store of stores) {
    await ensureAdmin(store.id, store.adminEmail);
    await resetCatalogData(store.id);
    if (store.id === 4) {
      await seedPapereriaCatalog(store.id);
    } else {
      await seedCatalog(store.id, assetDirs);
    }
  }

  console.log('Catalogos de prueba regenerados');
  console.log(
    'Stores:',
    stores.map((store) => `${store.id}:${store.domain}`).join(', '),
  );
  console.log(
    'Resumen por store:',
    stores
      .map((store) =>
        store.id === 4
          ? `${store.domain} -> ${PAPERERIA_CATEGORIES.length} categorias / ${PAPERERIA_PRODUCTS.length} productos`
          : `${store.domain} -> ${CATEGORY_DEFINITIONS.length} categorias / ${CATEGORY_DEFINITIONS.reduce(
              (sum, category) => sum + category.titles.length,
              0,
            )} productos`,
      )
      .join(' | '),
  );
  console.log('Usuarios admin disponibles:');
  for (const store of stores) {
    console.log(`- ${store.adminEmail} / admin123 (${store.domain})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
