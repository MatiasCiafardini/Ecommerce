-- Agrega el atributo Marca = Koxis a todos los productos activos de la tienda 7.
-- Idempotente: se puede ejecutar mas de una vez sin duplicar el valor.

BEGIN;

DO $$
DECLARE
  brand_option_id INTEGER;
  inserted_products INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Store" WHERE id = 7) THEN
    RAISE EXCEPTION 'No existe Store id 7 en esta base.';
  END IF;

  SELECT po.id
  INTO brand_option_id
  FROM "ProductOption" po
  WHERE po."storeId" = 7
    AND LOWER(po."name") = LOWER('Marca')
  ORDER BY
    CASE WHEN po."name" = 'Marca' THEN 0 ELSE 1 END,
    po.id
  LIMIT 1;

  IF brand_option_id IS NULL THEN
    INSERT INTO "ProductOption" ("name", "storeId", "attributeType", "createdAt", "updatedAt")
    VALUES ('Marca', 7, 'text', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO brand_option_id;
  ELSE
    UPDATE "ProductOption"
    SET "attributeType" = 'text',
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = brand_option_id;
  END IF;

  INSERT INTO "ProductOptionReusableValue" (
    "productOptionId",
    "value",
    "position",
    "visualColor",
    "createdAt"
  )
  VALUES (
    brand_option_id,
    'Koxis',
    COALESCE(
      (
        SELECT MAX(porv."position") + 1
        FROM "ProductOptionReusableValue" porv
        WHERE porv."productOptionId" = brand_option_id
      ),
      0
    ),
    NULL,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("productOptionId", "value") DO NOTHING;

  INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
  SELECT
    brand_option_id,
    p.id,
    'Koxis',
    CURRENT_TIMESTAMP
  FROM "Product" p
  WHERE p."storeId" = 7
    AND p."deletedAt" IS NULL
  ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;

  GET DIAGNOSTICS inserted_products = ROW_COUNT;
  RAISE NOTICE 'Marca=Koxis agregada a % productos de store 7.', inserted_products;
END $$;

COMMIT;
