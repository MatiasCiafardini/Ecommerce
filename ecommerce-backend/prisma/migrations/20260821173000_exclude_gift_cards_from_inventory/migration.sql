-- Gift cards represent stored value, not physical merchandise. Existing
-- records are excluded from inventory metrics and replenishment alerts.
UPDATE "Product" AS p
SET "inventoryPolicy" = 'UNTRACKED'::"ProductInventoryPolicy"
WHERE p."deletedAt" IS NULL
  AND (
    p.title ~* '(^|[[:space:]_-])gift[[:space:]_-]*card([[:space:]_-]|$)'
    OR p.title ~* '(^|[[:space:]_-])tarjeta[[:space:]]+(de[[:space:]]+)?regalo([[:space:]_-]|$)'
    OR EXISTS (
      SELECT 1
      FROM "ProductVariant" AS v
      WHERE v."productId" = p.id
        AND v."deletedAt" IS NULL
        AND v.sku ~* '^GIF[[:space:]_-]*CAR([[:space:]_-]|$)'
    )
  );
