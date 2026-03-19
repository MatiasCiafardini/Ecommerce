import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const buildDemoImageUrls = (slug: string) => [
  `https://picsum.photos/seed/${encodeURIComponent(`${slug}-look-1`)}/1200/1500`,
  `https://picsum.photos/seed/${encodeURIComponent(`${slug}-look-2`)}/1200/1500`,
  `https://picsum.photos/seed/${encodeURIComponent(`${slug}-look-3`)}/1200/1500`,
];

async function main() {
  const products = await prisma.product.findMany({
    include: {
      images: {
        orderBy: {
          position: 'asc',
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (products.length === 0) {
    console.log('No se encontraron productos para completar imagenes.');
    return;
  }

  for (const product of products) {
    const existingUrls = new Set(product.images.map((image) => image.url));
    const demoUrls = buildDemoImageUrls(product.slug);
    const nextImages = demoUrls.filter((url) => !existingUrls.has(url)).slice(
      0,
      Math.max(0, 3 - product.images.length),
    );

    if (nextImages.length === 0) {
      console.log(
        `Producto ${product.id} (${product.slug}) ya tiene ${product.images.length} imagen(es).`,
      );
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        images: {
          create: nextImages.map((url, index) => ({
            url,
            position: product.images.length + index,
          })),
        },
      },
    });

    console.log(
      `Producto ${product.id} (${product.slug}) actualizado con ${nextImages.length} imagen(es) demo.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
