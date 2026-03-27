import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

const PALETTES = [
  { base: '#121212', accent: '#f2eee8', support: '#8e6d54', glow: '#d9c7b2' },
  { base: '#17191d', accent: '#f0ece5', support: '#6b7a8f', glow: '#bcc8d8' },
  { base: '#141410', accent: '#f1ebdf', support: '#8a7557', glow: '#d6c0a0' },
  { base: '#171316', accent: '#f4ede7', support: '#814f56', glow: '#d6b0b6' },
  { base: '#0f1717', accent: '#f0efe8', support: '#43636b', glow: '#97b5bb' },
  { base: '#161313', accent: '#f5ece3', support: '#70534a', glow: '#caa696' },
] as const;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

async function main() {
  const categories = await prisma.category.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const assetDir = path.resolve(
    __dirname,
    '..',
    '..',
    'ecommerce-storefront',
    'public',
    'images',
    'seed-categories',
  );

  await fs.mkdir(assetDir, { recursive: true });

  for (const [index, category] of categories.entries()) {
    const filename = `${category.slug}.svg`;
    await fs.writeFile(
      path.join(assetDir, filename),
      buildCategorySvg({
        title: category.name,
        palette: PALETTES[index % PALETTES.length],
        collection: `Coleccion ${index + 1}`,
      }),
      'utf8',
    );

    await prisma.category.update({
      where: { id: category.id },
      data: {
        imageUrl: `/images/seed-categories/${filename}`,
      },
    });
  }

  console.log(`Imagenes de categorias actualizadas: ${categories.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
