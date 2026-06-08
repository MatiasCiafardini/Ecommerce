const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const storeIdArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--store-id='));
const storeId = storeIdArg ? Number(storeIdArg.split('=')[1]) : 7;

function roundTransferPrice(value) {
  return Math.round(value / 100) * 100;
}

function normalizeIdentityValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isComoVosYYoStore(store) {
  const theme = normalizeIdentityValue(store.storefrontConfig?.theme);
  const name = normalizeIdentityValue(store.name);
  const domain = normalizeIdentityValue(store.domain);

  return (
    theme === 'comovosyyo' ||
    name.includes('como vos y yo') ||
    name.includes('comovosyyo') ||
    domain.includes('comovosyyo')
  );
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw new Error('Use --store-id=<id> with a positive integer store id.');
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      domain: true,
      storefrontConfig: true,
      bankTransferDiscountPercentage: true,
    },
  });

  if (!store) {
    throw new Error(`Store ${storeId} not found.`);
  }

  if (!isComoVosYYoStore(store)) {
    throw new Error(`Store ${storeId} is not recognized as ComoVosYYo.`);
  }

  const discount = Number(store.bankTransferDiscountPercentage ?? 0);
  if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
    throw new Error(`Store ${storeId} does not have a valid transfer discount.`);
  }

  const multiplier = Number((1 - discount / 100).toFixed(6));
  const variants = await prisma.productVariant.findMany({
    where: {
      deletedAt: null,
      product: {
        storeId,
        deletedAt: null,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: [{ product: { title: 'asc' } }, { sku: 'asc' }],
  });

  const changes = variants
    .map((variant) => {
      const currentBasePrice = Number(variant.price);
      const currentTransferPrice = Number((currentBasePrice * multiplier).toFixed(2));
      const roundedTransferPrice = roundTransferPrice(currentTransferPrice);
      const nextBasePrice = Number((roundedTransferPrice / multiplier).toFixed(2));

      return {
        id: variant.id,
        productId: variant.productId,
        productTitle: variant.product.title,
        productSlug: variant.product.slug,
        sku: variant.sku,
        currentBasePrice,
        currentTransferPrice,
        roundedTransferPrice,
        nextBasePrice,
        transferDiff: Number((roundedTransferPrice - currentTransferPrice).toFixed(2)),
      };
    })
    .filter((change) => Math.abs(change.transferDiff) >= 0.01);

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        store: {
          id: store.id,
          name: store.name,
          domain: store.domain,
          discount,
          multiplier,
        },
        variants: variants.length,
        changes: changes.length,
        sample: changes.slice(0, 20),
      },
      null,
      2,
    ),
  );

  if (!apply || changes.length === 0) {
    return;
  }

  const backupDir = path.join(__dirname, '..', 'tmp');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `store-${storeId}-transfer-price-fix-backup-${timestamp()}.json`,
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        store,
        discount,
        multiplier,
        createdAt: new Date().toISOString(),
        variants: changes,
      },
      null,
      2,
    ),
  );

  await prisma.$transaction(
    changes.map((change) =>
      prisma.productVariant.update({
        where: { id: change.id },
        data: { price: change.nextBasePrice },
      }),
    ),
  );

  console.log(`Updated ${changes.length} variants.`);
  console.log(`Backup: ${backupPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
