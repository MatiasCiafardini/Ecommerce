const fs = require('node:fs/promises');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORY_THEMES = {
  remeras: {
    accent: '#f97316',
    secondary: '#22d3ee',
    label: 'Remeras',
    mood: 'Streetwear diario',
  },
  buzos: {
    accent: '#8b5cf6',
    secondary: '#facc15',
    label: 'Buzos',
    mood: 'Capas urbanas',
  },
  camperas: {
    accent: '#ef4444',
    secondary: '#f59e0b',
    label: 'Camperas',
    mood: 'Abrigo con presencia',
  },
  cargos: {
    accent: '#84cc16',
    secondary: '#f97316',
    label: 'Cargos',
    mood: 'Utilidad urbana',
  },
  pantalones: {
    accent: '#06b6d4',
    secondary: '#a855f7',
    label: 'Pantalones',
    mood: 'Movimiento y corte',
  },
  shorts: {
    accent: '#eab308',
    secondary: '#f43f5e',
    label: 'Shorts',
    mood: 'Verano callejero',
  },
  accesorios: {
    accent: '#f43f5e',
    secondary: '#fb7185',
    label: 'Accesorios',
    mood: 'Detalles que cierran',
  },
  joggers: {
    accent: '#14b8a6',
    secondary: '#60a5fa',
    label: 'Joggers',
    mood: 'Comodidad premium',
  },
  camisas: {
    accent: '#38bdf8',
    secondary: '#c084fc',
    label: 'Camisas',
    mood: 'Sastreria relajada',
  },
  chalecos: {
    accent: '#fb7185',
    secondary: '#f97316',
    label: 'Chalecos',
    mood: 'Capas con caracter',
  },
};

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildCategorySvg({ title, subtitle, accent, secondary }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="900" viewBox="0 0 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" rx="64" fill="#0F0F10"/>
  <rect width="1200" height="900" rx="64" fill="url(#bg)"/>
  <circle cx="1010" cy="190" r="220" fill="${accent}" fill-opacity="0.22"/>
  <circle cx="160" cy="760" r="250" fill="${secondary}" fill-opacity="0.18"/>
  <path d="M0 640C120 600 250 560 384 580C547 604 640 706 792 714C955 722 1055 636 1200 560V900H0V640Z" fill="#111113" fill-opacity="0.92"/>
  <path d="M160 144H480" stroke="rgba(255,255,255,0.34)" stroke-width="6" stroke-linecap="round"/>
  <path d="M160 184H420" stroke="rgba(255,255,255,0.18)" stroke-width="4" stroke-linecap="round"/>
  <text x="160" y="390" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="700" letter-spacing="-2">${escapeXml(title)}</text>
  <text x="164" y="454" fill="rgba(255,255,255,0.78)" font-family="Arial, Helvetica, sans-serif" font-size="28" letter-spacing="6">${escapeXml(subtitle.toUpperCase())}</text>
  <text x="160" y="720" fill="rgba(255,255,255,0.46)" font-family="Arial, Helvetica, sans-serif" font-size="24" letter-spacing="2">Curado para portada y navegacion visual</text>
  <defs>
    <linearGradient id="bg" x1="120" y1="80" x2="1080" y2="820" gradientUnits="userSpaceOnUse">
      <stop stop-color="#151517"/>
      <stop offset="0.48" stop-color="#1A1A1D"/>
      <stop offset="1" stop-color="#101012"/>
    </linearGradient>
  </defs>
</svg>`;
}

async function main() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  if (!categories.length) {
    console.log('No hay categorias para actualizar.');
    return;
  }

  const categoryDir = path.resolve(
    __dirname,
    '..',
    '..',
    'ecommerce-storefront',
    'public',
    'images',
    'seed-categories',
  );

  await fs.mkdir(categoryDir, { recursive: true });

  for (const category of categories) {
    const theme =
      CATEGORY_THEMES[category.slug] ??
      {
        accent: '#f97316',
        secondary: '#22d3ee',
        label: category.name,
        mood: 'Seleccion curada',
      };

    const filename = `${category.slug}.svg`;
    const absolutePath = path.join(categoryDir, filename);
    const publicUrl = `/images/seed-categories/${filename}`;

    const svg = buildCategorySvg({
      title: theme.label,
      subtitle: theme.mood,
      accent: theme.accent,
      secondary: theme.secondary,
    });

    await fs.writeFile(absolutePath, svg, 'utf8');

    await prisma.category.update({
      where: { id: category.id },
      data: { imageUrl: publicUrl },
    });
  }

  console.log(`Categorias actualizadas: ${categories.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
