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
  {
    id: 3005,
    name: 'Mi Maria Indumentaria',
    domain: 'localhost:3005',
    adminEmail: 'admin-mimaria@demo.com',
  },
] as const;

type DevelopmentStoreRecord = {
  id: number;
  name: string;
  domain: string;
  adminEmail: string;
};

function readStoreEnvCredential(
  storeId: number,
  key: "ACCESS_TOKEN" | "PUBLIC_KEY" | "WEBHOOK_SECRET",
) {
  return process.env[`STORE_${storeId}_MERCADOPAGO_${key}`]?.trim() || null;
}

const STREETWEAR_CATEGORY_DEFINITIONS = [
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

const BOUTIQUE_CATEGORY_DEFINITIONS = [
  {
    name: 'Blusas',
    singular: 'Blusa',
    slug: 'blusas',
    kind: 'shirt' as const,
    titles: ['Aurea', 'Luz Suave', 'Nacar', 'Brisa', 'Perla', 'Atelier', 'Aura', 'Seda Clara'],
    fits: ['relajada', 'fluida', 'regular delicada', 'femenina suave'],
  },
  {
    name: 'Sweaters',
    singular: 'Sweater',
    slug: 'sweaters',
    kind: 'sweater' as const,
    titles: ['Nube', 'Calma', 'Boucle', 'Rib Light', 'Avena', 'Marfil', 'Duna', 'Lino Knit'],
    fits: ['suave', 'relajado', 'tejido liviano', 'calce noble'],
  },
  {
    name: 'Jeans',
    singular: 'Jean',
    slug: 'jeans',
    kind: 'pants' as const,
    titles: ['Recto Claro', 'Linea Soft', 'Blue Atelier', 'Arena Denim', 'Pure Rise', 'Nude Fit', 'Classic Light', 'Ecru Line'],
    fits: ['recto', 'wide leg', 'relajado', 'tiro alto'],
  },
  {
    name: 'Vestidos',
    singular: 'Vestido',
    slug: 'vestidos',
    kind: 'dress' as const,
    titles: ['Luz', 'Bruma', 'Eter', 'Seda', 'Atardecer', 'Amapola', 'Nacar Midi', 'Aura Soft'],
    fits: ['midi', 'fluido', 'evasé', 'suave al cuerpo'],
  },
  {
    name: 'Tapados',
    singular: 'Tapado',
    slug: 'tapados',
    kind: 'jacket' as const,
    titles: ['Camel Line', 'Abrigo Nube', 'Soft Coat', 'Atelier Coat', 'Marfil Layer', 'Luz Coat', 'Nude Guard', 'Calma Coat'],
    fits: ['recto', 'liviano', 'relajado', 'estructurado suave'],
  },
  {
    name: 'Camisas',
    singular: 'Camisa',
    slug: 'camisas',
    kind: 'shirt' as const,
    titles: ['Lina', 'Marfil Shirt', 'Atelier Soft', 'Brisa Shirt', 'Clara', 'Nude Studio', 'Aura Shirt', 'Luz Pura'],
    fits: ['recta', 'liviana', 'relajada', 'clasica suave'],
  },
  {
    name: 'Polleras',
    singular: 'Pollera',
    slug: 'polleras',
    kind: 'skirt' as const,
    titles: ['Luz Skirt', 'Aura Midi', 'Seda Skirt', 'Bruma Line', 'Nacar Skirt', 'Calma Midi', 'Atelier Skirt', 'Perla Soft'],
    fits: ['midi', 'evasé', 'recta', 'fluida'],
  },
  {
    name: 'Cardigans',
    singular: 'Cardigan',
    slug: 'cardigans',
    kind: 'sweater' as const,
    titles: ['Avena Cardigan', 'Nube Knit', 'Soft Pearl', 'Lino Cardigan', 'Calma Knit', 'Marfil Knit', 'Brisa Layer', 'Aura Knit'],
    fits: ['tejido liviano', 'relajado', 'suave', 'abierto'],
  },
  {
    name: 'Blazers',
    singular: 'Blazer',
    slug: 'blazers',
    kind: 'jacket' as const,
    titles: ['Atelier Blazer', 'Nude Line', 'Luz Tailored', 'Camel Soft', 'Marfil Blazer', 'Calma Blazer', 'Seda Tailored', 'Aura Blazer'],
    fits: ['sastrero suave', 'recto', 'relajado', 'liviano'],
  },
] as const;

const STREETWEAR_COLLECTIONS = [
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

const BOUTIQUE_COLLECTIONS = [
  'Atelier Light',
  'Luz Serena',
  'Soft Linen',
  'Aura Nude',
  'Brisa Clara',
  'Marfil Studio',
  'Calma Edit',
  'Nacar Boutique',
] as const;

const SIZE_MAP: Record<string, string[]> = {
  tee: ['S', 'M', 'L', 'XL'],
  hoodie: ['M', 'L', 'XL'],
  sweater: ['S', 'M', 'L'],
  jacket: ['M', 'L', 'XL'],
  pants: ['38', '40', '42', '44'],
  dress: ['S', 'M', 'L'],
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
    sweater: 51990,
    jacket: 89990,
    pants: 64990,
    dress: 57990,
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
        <path d="M350 286l110-66 48 44 48-44 110 66-42 94-56-22v352H392V358l-56 22z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <path d="M392 358c64 18 152 18 216 0v352H392z" fill="${glow}" opacity="0.55" />
      `;
    case 'hoodie':
      return `
        <path d="M462 206c18-28 44-44 70-44s52 16 70 44l28 54-30 42H434l-30-42z" fill="${support}" opacity="0.72" />
        <path d="M338 324l118-52h152l118 52-42 92-60-24v318H440V392l-60 24z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <rect x="522" y="474" width="42" height="108" rx="20" fill="${support}" opacity="0.68" />
      `;
    case 'sweater':
      return `
        <path d="M372 284l110-60 58 42 58-42 110 60-36 98-66-26v354H474V356l-66 26z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <path d="M474 356c40 16 92 24 132 0v354H474z" fill="${glow}" opacity="0.5" />
        <path d="M432 688h56m160 0h56" stroke="${support}" stroke-width="14" stroke-linecap="round" opacity="0.54" />
      `;
    case 'jacket':
      return `
        <path d="M368 256l126-62 44 48 44-48 126 62-34 98-60-26v382H422V328l-60 26z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <rect x="534" y="224" width="12" height="486" rx="6" fill="${support}" />
        <rect x="426" y="456" width="48" height="86" rx="16" fill="${support}" opacity="0.46" />
        <rect x="594" y="456" width="48" height="86" rx="16" fill="${support}" opacity="0.46" />
      `;
    case 'pants':
      return `
        <path d="M420 218h232l-18 188-42 304h-82l-20-208-20 208h-82l-42-304z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <path d="M500 218v180m72-180v180" stroke="${glow}" stroke-width="12" opacity="0.52" />
      `;
    case 'dress':
      return `
        <path d="M500 208h80l18 64-10 48 118 398H374l118-398-10-48z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <path d="M482 272h116" stroke="${support}" stroke-width="12" opacity="0.58" />
        <path d="M478 420c40 28 84 28 124 0" stroke="${glow}" stroke-width="12" opacity="0.5" />
      `;
    case 'cargo':
      return `
        <path d="M416 220h240l-20 174-32 316h-86l-16-178-16 178h-86l-32-316z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <rect x="398" y="410" width="58" height="92" rx="16" fill="${support}" opacity="0.44" />
        <rect x="616" y="410" width="58" height="92" rx="16" fill="${support}" opacity="0.44" />
      `;
    case 'jogger':
      return `
        <path d="M422 220h228l-24 196-26 248c-4 24-24 42-48 42h-14l-18-158-18 158h-14c-24 0-44-18-48-42l-26-248z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <rect x="430" y="656" width="58" height="26" rx="13" fill="${support}" />
        <rect x="584" y="656" width="58" height="26" rx="13" fill="${support}" />
      `;
    case 'shirt':
      return `
        <path d="M370 258l120-62 38 42 38-42 120 62-36 90-54-22v384H424V326l-54 22z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <rect x="532" y="230" width="12" height="480" rx="6" fill="${support}" />
        <path d="M458 304h148" stroke="${glow}" stroke-width="12" opacity="0.5" />
      `;
    case 'shorts':
      return `
        <path d="M422 220h228l-24 144-28 182h-68l-22-122-22 122h-68l-28-182z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <path d="M500 220v120m72-120v120" stroke="${glow}" stroke-width="12" opacity="0.52" />
      `;
    case 'vest':
      return `
        <path d="M404 240l124-56 124 56-28 470H404z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <rect x="532" y="240" width="12" height="470" rx="6" fill="${support}" />
        <rect x="438" y="428" width="52" height="94" rx="16" fill="${support}" opacity="0.42" />
        <rect x="558" y="428" width="52" height="94" rx="16" fill="${support}" opacity="0.42" />
      `;
    case 'accessory':
      return `
        <path d="M390 452c0-82 62-138 146-138s146 56 146 138v54H390z" fill="${accent}" stroke="${support}" stroke-width="12" />
        <rect x="354" y="506" width="364" height="34" rx="17" fill="${support}" />
        <path d="M438 614h196v94H438z" fill="${glow}" opacity="0.42" />
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
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1080 1440" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${base}" />
        <stop offset="100%" stop-color="${glow}" />
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.72)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.28)" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1440" rx="56" fill="url(#bg)" />
    <g opacity="0.16" stroke="${support}" stroke-width="3">
      <path d="M0 220h1080" />
      <path d="M0 420h1080" />
      <path d="M0 620h1080" />
      <path d="M0 820h1080" />
      <path d="M0 1020h1080" />
      <path d="M140 0v1440" />
      <path d="M360 0v1440" />
      <path d="M580 0v1440" />
      <path d="M800 0v1440" />
      <path d="M1000 0v1440" />
    </g>
    <circle cx="860" cy="230" r="180" fill="#ffffff" opacity="0.24" />
    <circle cx="226" cy="1170" r="160" fill="${support}" opacity="0.15" />
    <rect x="64" y="64" width="952" height="1312" rx="46" fill="url(#panel)" stroke="rgba(255,255,255,0.46)" />
    <text x="118" y="136" fill="${support}" font-size="26" font-family="Arial, sans-serif" letter-spacing="7">STORE 2 TEST LAB</text>
    <text x="118" y="186" fill="${support}" font-size="18" font-family="Arial, sans-serif" letter-spacing="4">COLECCION</text>
    <g transform="translate(0 28)">
      ${shapeMarkup(args.kind, accent, support, glow)}
    </g>
    <rect x="118" y="1012" width="844" height="244" rx="34" fill="rgba(255,255,255,0.58)" stroke="rgba(255,255,255,0.48)" />
    <text x="154" y="1098" fill="${support}" font-size="26" font-family="Arial, sans-serif" letter-spacing="4">${escapeXml(args.subtitle.toUpperCase())}</text>
    <text x="154" y="1166" fill="${support}" font-size="56" font-weight="700" font-family="Arial, sans-serif">${escapeXml(args.title)}</text>
    <text x="154" y="1218" fill="${support}" font-size="26" font-family="Arial, sans-serif">Vista completa</text>
    <text x="154" y="1270" fill="${support}" font-size="22" font-family="Arial, sans-serif" opacity="0.8">${escapeXml(args.detail)}</text>
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
    <rect width="1600" height="900" rx="42" fill="url(#bg)" />
    <g opacity="0.14" stroke="${support}" stroke-width="2">
      <path d="M0 170h1600" />
      <path d="M0 340h1600" />
      <path d="M0 510h1600" />
      <path d="M0 680h1600" />
      <path d="M180 0v900" />
      <path d="M460 0v900" />
      <path d="M740 0v900" />
      <path d="M1020 0v900" />
      <path d="M1300 0v900" />
    </g>
    <circle cx="1290" cy="188" r="154" fill="#ffffff" opacity="0.22" />
    <rect x="74" y="74" width="1452" height="752" rx="36" fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.5)" />
    <text x="132" y="168" fill="${support}" font-size="28" font-family="Arial, sans-serif" letter-spacing="7">STORE 2 CATEGORY</text>
    <rect x="132" y="218" width="458" height="438" rx="42" fill="${accent}" fill-opacity="0.9" stroke="${support}" stroke-width="4" />
    <rect x="448" y="182" width="290" height="506" rx="48" fill="${support}" fill-opacity="0.24" />
    <rect x="540" y="270" width="170" height="320" rx="32" fill="${glow}" fill-opacity="0.48" />
    <text x="790" y="408" fill="${support}" font-size="84" font-weight="700" font-family="Arial, sans-serif">${escapeXml(args.title.toUpperCase())}</text>
    <text x="790" y="486" fill="${support}" font-size="30" font-family="Arial, sans-serif">Visual completa para cards anchas</text>
    <text x="790" y="560" fill="${support}" font-size="24" font-family="Arial, sans-serif" opacity="0.8">${escapeXml(args.collection)}</text>
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
            mercadoPagoWebhookSecret: readStoreEnvCredential(definition.id, "WEBHOOK_SECRET"),
          },
        })
      : await prisma.store.create({
          data: {
            id: definition.id,
            name: definition.name,
            domain: definition.domain,
            mercadoPagoAccessToken: readStoreEnvCredential(definition.id, "ACCESS_TOKEN"),
            mercadoPagoPublicKey: readStoreEnvCredential(definition.id, "PUBLIC_KEY"),
            mercadoPagoWebhookSecret: readStoreEnvCredential(definition.id, "WEBHOOK_SECRET"),
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

function getCatalogSeedConfig(storeId: number) {
  if (storeId === 2 || storeId === 3003 || storeId === 3005) {
    return {
      definitions: BOUTIQUE_CATEGORY_DEFINITIONS,
      collections: BOUTIQUE_COLLECTIONS,
    };
  }

  return {
    definitions: STREETWEAR_CATEGORY_DEFINITIONS,
    collections: STREETWEAR_COLLECTIONS,
  };
}

async function seedCatalog(
  storeId: number,
  assetDirs: Awaited<ReturnType<typeof ensureAssetDir>>,
) {
  const { catalogDir, categoryDir } = assetDirs;
  const { definitions, collections } = getCatalogSeedConfig(storeId);
  const categories = await Promise.all(
    definitions.map(async (definition, index) => {
      const categoryImageName = `${definition.slug}.svg`;
      await fs.writeFile(
        path.join(categoryDir, categoryImageName),
        buildCategorySvg({
          title: definition.name,
          palette: PALETTES[index % PALETTES.length],
          collection: collections[index % collections.length],
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

  for (const [categoryIndex, definition] of definitions.entries()) {
    const category = categories[categoryIndex];

    for (const [titleIndex, shortTitle] of definition.titles.entries()) {
      globalIndex += 1;

      const collection = collections[(globalIndex - 1) % collections.length];
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
          : `${store.domain} -> ${getCatalogSeedConfig(store.id).definitions.length} categorias / ${getCatalogSeedConfig(store.id).definitions.reduce(
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
