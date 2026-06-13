DROP INDEX IF EXISTS "CurrentAccount_storeId_customerId_key";

INSERT INTO "CurrentAccount" (
  "storeId",
  "storeLocationId",
  "customerId",
  "balance",
  "lastMovementAt",
  "createdAt",
  "updatedAt",
  "deletedAt"
)
SELECT
  movement_accounts."storeId",
  movement_accounts."storeLocationId",
  movement_accounts."customerId",
  0,
  movement_accounts."lastMovementAt",
  NOW(),
  NOW(),
  NULL
FROM (
  SELECT
    m."storeId",
    m."storeLocationId",
    m."customerId",
    MAX(m."createdAt") AS "lastMovementAt"
  FROM "CurrentAccountMovement" m
  WHERE m."storeLocationId" IS NOT NULL
  GROUP BY m."storeId", m."storeLocationId", m."customerId"
) movement_accounts
WHERE NOT EXISTS (
  SELECT 1
  FROM "CurrentAccount" existing
  WHERE existing."storeId" = movement_accounts."storeId"
    AND existing."customerId" = movement_accounts."customerId"
    AND existing."storeLocationId" = movement_accounts."storeLocationId"
);

UPDATE "CurrentAccountMovement" movement
SET "accountId" = account."id"
FROM "CurrentAccount" account
WHERE movement."storeLocationId" IS NOT NULL
  AND account."storeId" = movement."storeId"
  AND account."customerId" = movement."customerId"
  AND account."storeLocationId" = movement."storeLocationId"
  AND movement."accountId" <> account."id";

UPDATE "CurrentAccount" account
SET
  "balance" = balances."balance",
  "lastMovementAt" = balances."lastMovementAt",
  "updatedAt" = NOW()
FROM (
  SELECT
    "accountId",
    COALESCE(SUM("amount"), 0) AS "balance",
    MAX("createdAt") AS "lastMovementAt"
  FROM "CurrentAccountMovement"
  GROUP BY "accountId"
) balances
WHERE account."id" = balances."accountId";

UPDATE "CurrentAccount" account
SET
  "balance" = 0,
  "lastMovementAt" = NULL,
  "updatedAt" = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "CurrentAccountMovement" movement
  WHERE movement."accountId" = account."id"
);

CREATE UNIQUE INDEX "CurrentAccount_storeId_storeLocationId_customerId_key"
ON "CurrentAccount"("storeId", "storeLocationId", "customerId");
