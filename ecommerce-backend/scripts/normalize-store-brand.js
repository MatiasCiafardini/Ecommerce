const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const valueArg = args.find((arg) => arg.startsWith('--brand='));
const storeIdArg = args.find((arg) => arg.startsWith('--store-id='));
const storeId = Number(storeIdArg?.split('=')[1]);
const canonicalBrand = (valueArg?.slice('--brand='.length) || 'VCP').trim();

function identity(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR');
}

function isTrojaniStore(store) {
  const values = [store.name, store.domain, store.storefrontConfig?.theme].map(identity);
  return values.some((value) => value.includes('trojani'));
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw new Error('Use --store-id=<id> with the Trojani store id.');
  }
  if (!canonicalBrand) throw new Error('Brand cannot be empty.');

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, domain: true, storefrontConfig: true },
  });
  if (!store) throw new Error(`Store ${storeId} not found.`);
  if (!isTrojaniStore(store)) {
    throw new Error(`Store ${storeId} is not recognized as Trojani; no changes were made.`);
  }

  const brandOptions = await prisma.productOption.findMany({
    where: {
      storeId,
      OR: [
        { name: { equals: 'Marca', mode: 'insensitive' } },
        { name: { equals: 'Marcas', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true },
  });
  const optionIds = brandOptions.map((option) => option.id);
  const [products, optionValues, reusableValues] = await Promise.all([
    prisma.product.findMany({
      where: { storeId, brand: { equals: canonicalBrand, mode: 'insensitive' } },
      select: { id: true, title: true, brand: true },
    }),
    optionIds.length
      ? prisma.productOptionValue.findMany({
          where: {
            productOptionId: { in: optionIds },
            value: { equals: canonicalBrand, mode: 'insensitive' },
          },
          select: { id: true, productId: true, productOptionId: true, value: true },
        })
      : [],
    optionIds.length
      ? prisma.productOptionReusableValue.findMany({
          where: {
            productOptionId: { in: optionIds },
            value: { equals: canonicalBrand, mode: 'insensitive' },
          },
          select: { id: true, productOptionId: true, value: true, position: true },
        })
      : [],
  ]);

  const snapshot = { store, canonicalBrand, brandOptions, products, optionValues, reusableValues };
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    store: { id: store.id, name: store.name, domain: store.domain },
    canonicalBrand,
    productBrands: products.length,
    optionValues: optionValues.length,
    reusableValues: reusableValues.length,
    spellings: [...new Set([
      ...products.map((row) => row.brand),
      ...optionValues.map((row) => row.value),
      ...reusableValues.map((row) => row.value),
    ].filter(Boolean))],
  }, null, 2));

  if (!apply) return;

  const backupDir = path.join(__dirname, '..', 'tmp');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `store-${storeId}-brand-${identity(canonicalBrand)}-backup-${timestamp()}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(snapshot, null, 2));

  await prisma.$transaction(async (tx) => {
    await tx.product.updateMany({
      where: { storeId, brand: { equals: canonicalBrand, mode: 'insensitive' } },
      data: { brand: canonicalBrand },
    });

    for (const optionId of optionIds) {
      const entries = optionValues.filter((entry) => entry.productOptionId === optionId);
      const byProduct = new Map();
      for (const entry of entries) {
        const rows = byProduct.get(entry.productId) ?? [];
        rows.push(entry);
        byProduct.set(entry.productId, rows);
      }
      for (const rows of byProduct.values()) {
        const keeper = rows.find((row) => row.value === canonicalBrand) ?? rows[0];
        const duplicateIds = rows.filter((row) => row.id !== keeper.id).map((row) => row.id);
        if (duplicateIds.length) {
          await tx.productOptionValue.deleteMany({ where: { id: { in: duplicateIds } } });
        }
        await tx.productOptionValue.update({
          where: { id: keeper.id },
          data: { value: canonicalBrand },
        });
      }

      const reusable = reusableValues.filter((entry) => entry.productOptionId === optionId);
      if (reusable.length) {
        const keeper = reusable.find((row) => row.value === canonicalBrand) ?? reusable[0];
        const duplicateIds = reusable.filter((row) => row.id !== keeper.id).map((row) => row.id);
        if (duplicateIds.length) {
          await tx.productOptionReusableValue.deleteMany({ where: { id: { in: duplicateIds } } });
        }
        await tx.productOptionReusableValue.update({
          where: { id: keeper.id },
          data: { value: canonicalBrand },
        });
      }
    }
  });

  console.log(`Applied successfully. Backup: ${backupPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
