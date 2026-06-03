INSERT INTO "StoreShippingMethod" (
  "id",
  "storeId",
  "name",
  "type",
  "price",
  "freeShippingMinimumAmount",
  "estimatedDays",
  "description",
  "pickupAddress",
  "pickupHours",
  "pickupInstructions",
  "active",
  "displayOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'default-pickup-' || s."id",
  s."id",
  'Retiro en local',
  'pickup',
  0,
  NULL,
  0,
  'El cliente retira el pedido por el local.',
  NULL,
  NULL,
  NULL,
  true,
  0,
  NOW(),
  NOW()
FROM "Store" s
WHERE NOT EXISTS (
  SELECT 1
  FROM "StoreShippingMethod" m
  WHERE m."storeId" = s."id"
    AND m."deletedAt" IS NULL
    AND m."name" = 'Retiro en local'
);

INSERT INTO "StoreShippingMethod" (
  "id",
  "storeId",
  "name",
  "type",
  "price",
  "freeShippingMinimumAmount",
  "estimatedDays",
  "description",
  "pickupAddress",
  "pickupHours",
  "pickupInstructions",
  "active",
  "displayOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'default-home-' || s."id",
  s."id",
  'Envio a domicilio',
  'manual',
  0,
  NULL,
  3,
  'Envio a domicilio con costo a coordinar.',
  NULL,
  NULL,
  NULL,
  true,
  1,
  NOW(),
  NOW()
FROM "Store" s
WHERE NOT EXISTS (
  SELECT 1
  FROM "StoreShippingMethod" m
  WHERE m."storeId" = s."id"
    AND m."deletedAt" IS NULL
    AND m."name" = 'Envio a domicilio'
);

INSERT INTO "StoreShippingMethod" (
  "id",
  "storeId",
  "name",
  "type",
  "price",
  "freeShippingMinimumAmount",
  "estimatedDays",
  "description",
  "pickupAddress",
  "pickupHours",
  "pickupInstructions",
  "active",
  "displayOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'default-coordinate-' || s."id",
  s."id",
  'Envio a coordinar',
  'coordinar',
  0,
  NULL,
  NULL,
  'El comercio coordina el envio con el cliente.',
  NULL,
  NULL,
  NULL,
  true,
  2,
  NOW(),
  NOW()
FROM "Store" s
WHERE NOT EXISTS (
  SELECT 1
  FROM "StoreShippingMethod" m
  WHERE m."storeId" = s."id"
    AND m."deletedAt" IS NULL
    AND m."name" = 'Envio a coordinar'
);
