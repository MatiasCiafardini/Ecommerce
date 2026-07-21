const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { runtimeConfig } = require(path.join(
  process.cwd(),
  'dist/src/config/runtime-config',
));

const [, , manifestPath, sourceDir, backupDir] = process.argv;

if (!manifestPath || !sourceDir || !backupDir) {
  throw new Error('Usage: node import-product-images-manifest.js MANIFEST SOURCE_DIR BACKUP_DIR');
}

const prisma = new PrismaClient();
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

async function main() {
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(runtimeConfig.uploadsDir, { recursive: true });

  const before = await prisma.product.findMany({
    where: { storeId: 7, deletedAt: null },
    select: {
      id: true,
      title: true,
      images: { orderBy: { position: 'asc' } },
    },
  });
  fs.writeFileSync(
    path.join(backupDir, 'product-images-before.json'),
    JSON.stringify(before, null, 2),
  );

  const created = [];
  const productIds = [...new Set(manifest.map((item) => item.productId))];
  const targetProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: 7, deletedAt: null },
    include: { images: true },
  });
  const productsById = new Map(targetProducts.map((product) => [product.id, product]));

  for (const productId of productIds) {
    const product = productsById.get(productId);
    if (!product) throw new Error(`Missing product ${productId}`);
    if (product.images.length !== 0) {
      throw new Error(`Product ${productId} no longer has zero images`);
    }
    const incomingCount = manifest.filter((item) => item.productId === productId).length;
    if (incomingCount > 10) throw new Error(`Image limit exceeded for ${productId}`);
  }

  const positions = new Map(productIds.map((productId) => [productId, 0]));

  try {
    for (const item of manifest) {
      const product = productsById.get(item.productId);
      if (product.title !== item.title) {
        throw new Error(`Product title changed for ${item.productId}: ${product.title}`);
      }

      const source = path.join(sourceDir, item.file);
      if (!fs.existsSync(source)) throw new Error(`Missing staged file ${item.file}`);

      const extension = path.extname(item.file).toLowerCase();
      const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
      const destination = path.join(runtimeConfig.uploadsDir, filename);
      fs.copyFileSync(source, destination);

      try {
        const image = await prisma.productImage.create({
          data: {
            productId: item.productId,
            url: `/uploads/${filename}`,
            position: positions.get(item.productId),
          },
        });
        created.push({
          imageId: image.id,
          productId: item.productId,
          title: item.title,
          originalName: item.file,
          url: image.url,
          destination,
        });
        positions.set(item.productId, positions.get(item.productId) + 1);
      } catch (error) {
        fs.unlinkSync(destination);
        throw error;
      }
    }

    fs.writeFileSync(
      path.join(backupDir, 'created-manifest.json'),
      JSON.stringify(created.map(({ destination, ...item }) => item), null, 2),
    );
    console.log(JSON.stringify({ ok: true, backupDir, created: created.length }));
  } catch (error) {
    for (const item of created.reverse()) {
      await prisma.productImage.deleteMany({ where: { id: item.imageId } });
      if (fs.existsSync(item.destination)) fs.unlinkSync(item.destination);
    }
    throw error;
  }
}

main().finally(() => prisma.$disconnect());
