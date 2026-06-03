const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const storeId = Number(process.argv[2] ?? 7);
const outputArg = process.argv[3];
const outputPath =
  outputArg ??
  path.join(
    __dirname,
    "..",
    "tmp",
    `store-${storeId}-catalog-production-import-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`,
  );

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBool(value) {
  return value ? "TRUE" : "FALSE";
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return String(value);
}

function sqlDate(value) {
  if (!value) return "NULL";
  return `${sqlString(new Date(value).toISOString())}::timestamp`;
}

function sqlDecimal(value) {
  if (value === null || value === undefined) return "NULL";
  return String(value);
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function insertValues(rows, columns) {
  return rows
    .map(
      (row) =>
        `(${columns
          .map((column) => row[column])
          .join(", ")})`,
    )
    .join(",\n");
}

async function main() {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw new Error(`No existe la tienda local con id ${storeId}.`);
  }

  const categories = await prisma.category.findMany({
    where: { storeId },
    orderBy: [{ parentId: "asc" }, { id: "asc" }],
  });

  const productOptions = await prisma.productOption.findMany({
    where: { storeId },
    include: { reusableValues: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
    orderBy: [{ name: "asc" }],
  });

  const products = await prisma.product.findMany({
    where: { storeId },
    include: {
      categories: { include: { category: true } },
      images: { orderBy: [{ position: "asc" }, { id: "asc" }] },
      optionValues: { include: { productOption: true }, orderBy: [{ productOptionId: "asc" }, { value: "asc" }] },
      variants: {
        include: { inventories: true },
        orderBy: [{ id: "asc" }],
      },
    },
    orderBy: [{ id: "asc" }],
  });

  const lines = [];
  lines.push("-- Importacion de catalogo local para produccion");
  lines.push(`-- Tienda local: ${store.name} (storeId ${storeId})`);
  lines.push(`-- Generado: ${new Date().toISOString()}`);
  lines.push(`-- Productos: ${products.length}`);
  lines.push(`-- Variantes: ${products.reduce((total, product) => total + product.variants.length, 0)}`);
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");
  lines.push(`DO $$`);
  lines.push("BEGIN");
  lines.push(`  IF NOT EXISTS (SELECT 1 FROM "Store" WHERE id = ${storeId}) THEN`);
  lines.push(`    RAISE EXCEPTION 'No existe Store id ${storeId} en esta base. Crear o mapear la tienda antes de importar.';`);
  lines.push("  END IF;");
  lines.push("END $$;");
  lines.push("");

  if (categories.length > 0) {
    lines.push("-- Categorias");
    lines.push(
      `INSERT INTO "Category" ("name", "slug", "description", "status", "storeId", "createdAt", "updatedAt", "deletedAt", "imageUrl") VALUES\n${insertValues(
        categories.map((category) => ({
          name: sqlString(category.name),
          slug: sqlString(category.slug),
          description: sqlString(category.description),
          status: sqlString(category.status),
          storeId: String(storeId),
          createdAt: sqlDate(category.createdAt),
          updatedAt: sqlDate(category.updatedAt),
          deletedAt: sqlDate(category.deletedAt),
          imageUrl: sqlString(category.imageUrl),
        })),
        ["name", "slug", "description", "status", "storeId", "createdAt", "updatedAt", "deletedAt", "imageUrl"],
      )}
ON CONFLICT ("slug", "storeId") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "status" = EXCLUDED."status",
  "updatedAt" = EXCLUDED."updatedAt",
  "deletedAt" = EXCLUDED."deletedAt",
  "imageUrl" = EXCLUDED."imageUrl";`,
    );
    lines.push("");
    for (const category of categories.filter((category) => category.parentId)) {
      const parent = categories.find((candidate) => candidate.id === category.parentId);
      if (!parent) continue;
      lines.push(
        `UPDATE "Category" child SET "parentId" = parent.id
FROM "Category" parent
WHERE child."storeId" = ${storeId}
  AND parent."storeId" = ${storeId}
  AND child.slug = ${sqlString(category.slug)}
  AND parent.slug = ${sqlString(parent.slug)};`,
      );
    }
    lines.push("");
  }

  if (productOptions.length > 0) {
    lines.push("-- Atributos reutilizables");
    lines.push(
      `INSERT INTO "ProductOption" ("name", "storeId", "attributeType", "createdAt", "updatedAt") VALUES\n${insertValues(
        productOptions.map((option) => ({
          name: sqlString(option.name),
          storeId: String(storeId),
          attributeType: sqlString(option.attributeType),
          createdAt: sqlDate(option.createdAt),
          updatedAt: sqlDate(option.updatedAt),
        })),
        ["name", "storeId", "attributeType", "createdAt", "updatedAt"],
      )}
ON CONFLICT ("storeId", "name") DO UPDATE SET
  "attributeType" = EXCLUDED."attributeType",
  "updatedAt" = EXCLUDED."updatedAt";`,
    );
    lines.push("");

    for (const option of productOptions) {
      for (const reusable of option.reusableValues) {
        lines.push(
          `INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, ${sqlString(reusable.value)}, ${sqlNumber(reusable.position)}, ${sqlString(reusable.visualColor)}, ${sqlDate(reusable.createdAt)}
FROM "ProductOption" po
WHERE po."storeId" = ${storeId} AND po."name" = ${sqlString(option.name)}
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";`,
        );
      }
    }
    lines.push("");
  }

  if (products.length > 0) {
    lines.push("-- Productos");
    lines.push(
      `INSERT INTO "Product" ("title", "description", "storeId", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "packagingTemplateId", "createdAt", "published", "slug", "deletedAt") VALUES\n${insertValues(
        products.map((product) => ({
          title: sqlString(product.title),
          description: sqlString(product.description),
          storeId: String(storeId),
          weightGrams: sqlNumber(product.weightGrams),
          packageHeightCm: sqlNumber(product.packageHeightCm),
          packageWidthCm: sqlNumber(product.packageWidthCm),
          packageLengthCm: sqlNumber(product.packageLengthCm),
          packagingTemplateId: sqlString(product.packagingTemplateId),
          createdAt: sqlDate(product.createdAt),
          published: sqlBool(product.published),
          slug: sqlString(product.slug),
          deletedAt: sqlDate(product.deletedAt),
        })),
        [
          "title",
          "description",
          "storeId",
          "weightGrams",
          "packageHeightCm",
          "packageWidthCm",
          "packageLengthCm",
          "packagingTemplateId",
          "createdAt",
          "published",
          "slug",
          "deletedAt",
        ],
      )}
ON CONFLICT ("slug", "storeId") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "weightGrams" = EXCLUDED."weightGrams",
  "packageHeightCm" = EXCLUDED."packageHeightCm",
  "packageWidthCm" = EXCLUDED."packageWidthCm",
  "packageLengthCm" = EXCLUDED."packageLengthCm",
  "packagingTemplateId" = EXCLUDED."packagingTemplateId",
  "published" = EXCLUDED."published",
  "deletedAt" = EXCLUDED."deletedAt";`,
    );
    lines.push("");
  }

  lines.push("-- Vinculos de categorias");
  for (const product of products) {
    for (const relation of product.categories) {
      lines.push(
        `INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = ${storeId}
  AND p.slug = ${sqlString(product.slug)}
  AND c.slug = ${sqlString(relation.category.slug)}
ON CONFLICT ("productId", "categoryId") DO NOTHING;`,
      );
    }
  }
  lines.push("");

  lines.push("-- Valores de atributos por producto");
  for (const product of products) {
    for (const value of product.optionValues) {
      lines.push(
        `INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, ${sqlString(value.value)}, ${sqlDate(value.createdAt)}
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = ${storeId}
  AND p.slug = ${sqlString(product.slug)}
  AND po."name" = ${sqlString(value.productOption.name)}
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;`,
      );
    }
  }
  lines.push("");

  lines.push("-- Imagenes");
  for (const product of products) {
    for (const image of product.images) {
      lines.push(
        `INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, ${sqlString(image.url)}, ${sqlNumber(image.position)}, ${sqlNumber(image.offsetX)}, ${sqlNumber(image.offsetY)}, ${sqlNumber(image.zoom)}
FROM "Product" p
WHERE p."storeId" = ${storeId}
  AND p.slug = ${sqlString(product.slug)}
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = ${sqlString(image.url)}
      AND existing.position = ${sqlNumber(image.position)}
  );`,
      );
    }
  }
  lines.push("");

  lines.push("-- Variantes e inventario");
  for (const product of products) {
    for (const variant of product.variants) {
      const variantColumns = {
        sku: sqlString(variant.sku),
        price: sqlDecimal(variant.price),
        weightGrams: sqlNumber(variant.weightGrams),
        packageHeightCm: sqlNumber(variant.packageHeightCm),
        packageWidthCm: sqlNumber(variant.packageWidthCm),
        packageLengthCm: sqlNumber(variant.packageLengthCm),
        height: sqlNumber(variant.height),
        length: sqlNumber(variant.length),
        weight: sqlNumber(variant.weight),
        width: sqlNumber(variant.width),
        deletedAt: sqlDate(variant.deletedAt),
        Color: sqlString(variant.Color),
        Size: sqlString(variant.Size),
        waistSize: sqlString(variant.waistSize),
      };
      lines.push(
        `WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = ${storeId} AND slug = ${sqlString(product.slug)}
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = ${variantColumns.sku}
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = ${variantColumns.price},
    "weightGrams" = ${variantColumns.weightGrams},
    "packageHeightCm" = ${variantColumns.packageHeightCm},
    "packageWidthCm" = ${variantColumns.packageWidthCm},
    "packageLengthCm" = ${variantColumns.packageLengthCm},
    "height" = ${variantColumns.height},
    "length" = ${variantColumns.length},
    "weight" = ${variantColumns.weight},
    "width" = ${variantColumns.width},
    "deletedAt" = ${variantColumns.deletedAt},
    "Color" = ${variantColumns.Color},
    "Size" = ${variantColumns.Size},
    "waistSize" = ${variantColumns.waistSize}
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, ${variantColumns.sku}, ${variantColumns.price}, ${variantColumns.weightGrams}, ${variantColumns.packageHeightCm}, ${variantColumns.packageWidthCm}, ${variantColumns.packageLengthCm}, ${variantColumns.height}, ${variantColumns.length}, ${variantColumns.weight}, ${variantColumns.width}, ${variantColumns.deletedAt}, ${variantColumns.Color}, ${variantColumns.Size}, ${variantColumns.waistSize}
  FROM product_row p
  WHERE NOT EXISTS (SELECT 1 FROM existing_variant)
  RETURNING id
),
target_variant AS (
  SELECT id FROM updated_variant
  UNION ALL
  SELECT id FROM inserted_variant
)
INSERT INTO "Inventory" ("variantId", "quantity", "reserved", "updatedAt", "storeId")
SELECT tv.id, ${sqlNumber(variant.inventories[0]?.quantity ?? 0)}, ${sqlNumber(variant.inventories[0]?.reserved ?? 0)}, NOW(), ${storeId}
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();`,
      );
    }
  }
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
  console.log(JSON.stringify({ outputPath, products: products.length, variants: products.reduce((total, product) => total + product.variants.length, 0) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
