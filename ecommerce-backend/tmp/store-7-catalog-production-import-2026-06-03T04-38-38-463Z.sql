-- Importacion de catalogo local para produccion
-- Tienda local: Como Vos y Yo (storeId 7)
-- Generado: 2026-06-03T04:38:38.546Z
-- Productos: 36
-- Variantes: 195

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Store" WHERE id = 7) THEN
    RAISE EXCEPTION 'No existe Store id 7 en esta base. Crear o mapear la tienda antes de importar.';
  END IF;
END $$;

-- Categorias
INSERT INTO "Category" ("name", "slug", "description", "status", "storeId", "createdAt", "updatedAt", "deletedAt", "imageUrl") VALUES
('Abrigos', 'abrigos', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Accesorios', 'accesorios', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Calzados', 'calzados', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Camisas y blusas', 'camisas-y-blusas', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Chalecos', 'chalecos', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Gift Card', 'gift-card', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Jeans', 'jeans', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Pantalones', 'pantalones', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Remeras y musculosas', 'remeras-y-musculosas', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Sweaters y sacos', 'sweaters-y-sacos', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('Vestidos', 'vestidos', NULL, 'active', 7, '2026-05-30T13:25:45.714Z'::timestamp, '2026-05-30T13:25:45.714Z'::timestamp, NULL, NULL),
('test', 'test', 'test', 'active', 7, '2026-05-30T13:27:14.738Z'::timestamp, '2026-05-30T13:27:23.939Z'::timestamp, '2026-05-30T13:27:23.939Z'::timestamp, NULL)
ON CONFLICT ("slug", "storeId") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "status" = EXCLUDED."status",
  "updatedAt" = EXCLUDED."updatedAt",
  "deletedAt" = EXCLUDED."deletedAt",
  "imageUrl" = EXCLUDED."imageUrl";


-- Atributos reutilizables
INSERT INTO "ProductOption" ("name", "storeId", "attributeType", "createdAt", "updatedAt") VALUES
('Ancho cintura', 7, 'text', '2026-05-30T13:48:22.958Z'::timestamp, '2026-05-30T13:48:22.958Z'::timestamp),
('Color', 7, 'color', '2026-05-18T17:57:32.140Z'::timestamp, '2026-05-29T21:08:42.199Z'::timestamp),
('Estacion', 7, 'text', '2026-05-29T19:28:56.752Z'::timestamp, '2026-05-29T17:16:16.826Z'::timestamp),
('Talle', 7, 'text', '2026-05-18T17:57:32.140Z'::timestamp, '2026-05-29T17:16:16.826Z'::timestamp),
('Test', 7, 'text', '2026-05-29T21:08:56.681Z'::timestamp, '2026-05-29T21:08:56.681Z'::timestamp),
('Textura', 7, 'text', '2026-05-29T20:59:21.224Z'::timestamp, '2026-05-29T21:08:03.724Z'::timestamp)
ON CONFLICT ("storeId", "name") DO UPDATE SET
  "attributeType" = EXCLUDED."attributeType",
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Beige', 0, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Blanco', 1, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Chocolate', 2, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Crudo', 3, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Jean', 4, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Negro', 5, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Verde', 6, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Verano', 0, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Estacion'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'L', 0, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'M', 1, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'S', 2, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Unico', 3, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'XL', 4, NULL, '2026-05-29T17:02:23.961Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Esto', 0, NULL, '2026-05-29T21:08:56.711Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Test'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Es', 1, NULL, '2026-05-29T21:08:56.738Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Test'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Un', 2, NULL, '2026-05-29T21:08:56.764Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Test'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Test ese', 3, NULL, '2026-05-29T21:08:56.789Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Test'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Lino', 0, NULL, '2026-05-29T20:59:21.280Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'Madera', 1, NULL, '2026-05-29T20:59:21.315Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";
INSERT INTO "ProductOptionReusableValue" ("productOptionId", "value", "position", "visualColor", "createdAt")
SELECT po.id, 'tela', 2, NULL, '2026-05-29T20:59:21.378Z'::timestamp
FROM "ProductOption" po
WHERE po."storeId" = 7 AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "value") DO UPDATE SET
  "position" = EXCLUDED."position",
  "visualColor" = EXCLUDED."visualColor";

-- Productos
INSERT INTO "Product" ("title", "description", "storeId", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "packagingTemplateId", "createdAt", "published", "slug", "deletedAt") VALUES
('Camisa oversize lino', 'Camisa liviana de lino con calce amplio y caida suave para looks relajados.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.145Z'::timestamp, TRUE, 'camisa-oversize-lino', '2026-05-30T13:20:10.028Z'::timestamp),
('Jean wide leg', 'Jean tiro alto de pierna amplia, ideal para combinar con basicos y sastreria.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.174Z'::timestamp, TRUE, 'jean-wide-leg', '2026-05-30T13:20:10.028Z'::timestamp),
('Chaleco sastrero', 'Chaleco estructurado con linea limpia para sumar capas elegantes.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.183Z'::timestamp, TRUE, 'chaleco-sastrero', '2026-05-30T13:20:10.028Z'::timestamp),
('Sweater tejido', 'Sweater suave de punto con textura delicada y calce relajado.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.191Z'::timestamp, TRUE, 'sweater-tejido', '2026-05-30T13:20:10.028Z'::timestamp),
('Blazer clasico', 'Blazer sastrero atemporal para elevar prendas simples de todos los dias.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.198Z'::timestamp, TRUE, 'blazer-clasico', '2026-05-30T13:20:10.028Z'::timestamp),
('Pantalon sastrero', 'Pantalon de tiro alto con pinzas y caida elegante para oficina o salida.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.204Z'::timestamp, TRUE, 'pantalon-sastrero', '2026-05-30T13:20:10.028Z'::timestamp),
('Remera basica', 'Remera de algodon suave, cuello redondo y calce comodo para todos los dias.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.210Z'::timestamp, TRUE, 'remera-basica', '2026-05-30T13:20:10.028Z'::timestamp),
('Buzo urbano', 'Buzo relajado de frisa liviana para sumar abrigo sin perder prolijidad.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.216Z'::timestamp, TRUE, 'buzo-urbano', '2026-05-30T13:20:10.028Z'::timestamp),
('Vestido midi', 'Vestido midi de silueta fluida, femenino y facil de llevar.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.222Z'::timestamp, TRUE, 'vestido-midi', '2026-05-30T13:20:10.028Z'::timestamp),
('Campera de jean', 'Campera denim clasica con lavado medio y estructura versatil.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.228Z'::timestamp, TRUE, 'campera-de-jean', '2026-05-30T13:20:10.028Z'::timestamp),
('Blusa satinada', 'Blusa de caida suave con brillo sutil para looks mas arreglados.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.236Z'::timestamp, TRUE, 'blusa-satinada', '2026-05-30T13:20:10.028Z'::timestamp),
('Tote bag', 'Bolso amplio y estructurado para acompanar la rutina diaria.', 7, NULL, NULL, NULL, NULL, NULL, '2026-05-18T17:57:32.242Z'::timestamp, TRUE, 'tote-bag', '2026-05-30T13:20:10.028Z'::timestamp),
('Remera test', 'Esto es una remera test', 7, 250, 4, 22, 28, 'small-bag', '2026-05-29T19:28:09.782Z'::timestamp, TRUE, 'remera-test', '2026-05-30T13:20:10.028Z'::timestamp),
('test', 'test', 7, 250, 4, 22, 28, 'small-bag', '2026-05-30T13:25:07.465Z'::timestamp, FALSE, 'test', '2026-05-30T13:25:14.522Z'::timestamp),
('Jean Barrel Grey', NULL, 7, 450, 6, 28, 36, 'medium-bag', '2026-05-30T13:49:43.777Z'::timestamp, TRUE, 'jean-barrel-grey', NULL),
('Jean ballon grey', NULL, 7, 450, 6, 28, 36, 'medium-bag', '2026-05-30T14:16:38.515Z'::timestamp, TRUE, 'jean-ballon-grey', NULL),
('Jean Oxford blue medio', NULL, 7, 450, 6, 28, 36, 'medium-bag', '2026-05-30T14:26:45.464Z'::timestamp, TRUE, 'jean-oxford-blue-medio', NULL),
('Jean straight crop medio', NULL, 7, 250, 4, 22, 28, 'small-bag', '2026-05-30T14:33:14.509Z'::timestamp, TRUE, 'jean-straight-crop-medio', NULL),
('Jean Oxford elastizado', NULL, 7, 250, 4, 22, 28, 'small-bag', '2026-05-30T14:40:16.889Z'::timestamp, TRUE, 'jean-oxford-elastizado', NULL),
('Jean Barrel', NULL, 7, 250, 4, 22, 28, 'small-bag', '2026-05-30T14:54:40.970Z'::timestamp, TRUE, 'jean-barrel', NULL),
('Jean relax uva', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:04:33.332Z'::timestamp, TRUE, 'jean-relax-uva', NULL),
('Jean relax chocolate', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:20:48.102Z'::timestamp, TRUE, 'jean-relax-chocolate', NULL),
('Jean relax verde', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:24:09.311Z'::timestamp, TRUE, 'jean-relax-verde', NULL),
('Jean straight negro', NULL, 7, NULL, NULL, NULL, NULL, NULL, '2026-05-30T15:32:32.744Z'::timestamp, TRUE, 'jean-straight-negro', NULL),
('Jean straight matizado', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:39:06.296Z'::timestamp, TRUE, 'jean-straight-matizado', NULL),
('Jean stright print chocolate', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:43:18.089Z'::timestamp, TRUE, 'jean-stright-print-chocolate', NULL),
('Jean wide matizado', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:47:56.194Z'::timestamp, TRUE, 'jean-wide-matizado', NULL),
('Jean straight blue', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:51:47.929Z'::timestamp, TRUE, 'jean-straight-blue', NULL),
('Jean straight blue tiro medio', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T15:59:27.320Z'::timestamp, TRUE, 'jean-straight-blue-tiro-medio', NULL),
('Jean straight blue normal', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T16:03:30.179Z'::timestamp, TRUE, 'jean-straight-blue-normal', NULL),
('Jean carrot blue', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T16:06:28.569Z'::timestamp, TRUE, 'jean-carrot-blue', NULL),
('Jean oxford light blue', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T16:12:40.408Z'::timestamp, TRUE, 'jean-oxford-light-blue', NULL),
('Jean bootcut black grey', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T16:17:34.452Z'::timestamp, TRUE, 'jean-bootcut-black-grey', NULL),
('Jean barrel military', NULL, 7, NULL, NULL, NULL, NULL, NULL, '2026-05-30T16:23:48.739Z'::timestamp, TRUE, 'jean-barrel-military', NULL),
('Jean baggy vison', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T16:30:39.584Z'::timestamp, TRUE, 'jean-baggy-vison', NULL),
('Jean slim flare dark blue', NULL, 7, 750, 9, 35, 45, 'large-bag', '2026-05-30T16:42:22.241Z'::timestamp, TRUE, 'jean-slim-flare-dark-blue', NULL)
ON CONFLICT ("slug", "storeId") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "weightGrams" = EXCLUDED."weightGrams",
  "packageHeightCm" = EXCLUDED."packageHeightCm",
  "packageWidthCm" = EXCLUDED."packageWidthCm",
  "packageLengthCm" = EXCLUDED."packageLengthCm",
  "packagingTemplateId" = EXCLUDED."packagingTemplateId",
  "published" = EXCLUDED."published",
  "deletedAt" = EXCLUDED."deletedAt";

-- Vinculos de categorias
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel-grey'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-ballon-grey'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-oxford-blue-medio'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-crop-medio'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-oxford-elastizado'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-uva'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-chocolate'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-verde'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-matizado'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-stright-print-chocolate'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-wide-matizado'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-blue'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-blue-tiro-medio'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-blue-normal'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-carrot-blue'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-oxford-light-blue'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-bootcut-black-grey'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel-military'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT p.id, c.id
FROM "Product" p
JOIN "Category" c ON c."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-slim-flare-dark-blue'
  AND c.slug = 'jeans'
ON CONFLICT ("productId", "categoryId") DO NOTHING;

-- Valores de atributos por producto
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'L', '2026-05-30T14:11:08.730Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel-grey'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'S', '2026-05-30T14:11:08.730Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel-grey'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T14:11:08.730Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel-grey'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Gris', '2026-05-30T14:19:06.344Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-ballon-grey'
  AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'L', '2026-05-30T14:19:06.344Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-ballon-grey'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'M', '2026-05-30T14:19:06.344Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-ballon-grey'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T14:19:06.344Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-ballon-grey'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T14:26:45.485Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-oxford-blue-medio'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T14:33:14.517Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-crop-medio'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T14:43:35.171Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-oxford-elastizado'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T14:56:58.975Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'L', '2026-05-30T15:04:33.355Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-uva'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'M', '2026-05-30T15:04:33.355Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-uva'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'S', '2026-05-30T15:04:33.355Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-uva'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T15:04:33.355Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-uva'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'XL', '2026-05-30T15:20:48.108Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-chocolate'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T15:20:48.108Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-chocolate'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T15:24:09.323Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-relax-verde'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T15:33:43.711Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-negro'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T15:39:06.300Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-matizado'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T15:43:18.112Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-stright-print-chocolate'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T15:47:56.201Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-wide-matizado'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T15:51:47.934Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-blue'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T15:59:27.324Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-blue-tiro-medio'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T16:03:30.186Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-straight-blue-normal'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T16:06:28.584Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-carrot-blue'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T16:12:40.412Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-oxford-light-blue'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Semi elastizado', '2026-05-30T16:17:34.465Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-bootcut-black-grey'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Militar', '2026-05-30T16:23:48.743Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel-military'
  AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T16:23:48.743Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-barrel-military'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Chocolate', '2026-05-30T16:30:39.600Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Militar', '2026-05-30T16:30:39.600Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Vison', '2026-05-30T16:30:39.600Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND po."name" = 'Color'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'L', '2026-05-30T16:30:39.600Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'M', '2026-05-30T16:30:39.600Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'S', '2026-05-30T16:30:39.600Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND po."name" = 'Talle'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Tela rigida', '2026-05-30T16:30:39.600Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-baggy-vison'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;
INSERT INTO "ProductOptionValue" ("productOptionId", "productId", "value", "createdAt")
SELECT po.id, p.id, 'Elastisado', '2026-05-30T16:42:22.256Z'::timestamp
FROM "Product" p
JOIN "ProductOption" po ON po."storeId" = p."storeId"
WHERE p."storeId" = 7
  AND p.slug = 'jean-slim-flare-dark-blue'
  AND po."name" = 'Textura'
ON CONFLICT ("productOptionId", "productId", "value") DO NOTHING;

-- Imagenes
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/camisa-oversize-lino.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'camisa-oversize-lino'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/camisa-oversize-lino.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/uploads/1780080122596-659021306.jpg', 1, 40, 14.70886589571921, 1.24
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'camisa-oversize-lino'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/uploads/1780080122596-659021306.jpg'
      AND existing.position = 1
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/uploads/1780080128228-39500687.jpg', 2, -34.90566037735849, 29.55974842767295, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'camisa-oversize-lino'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/uploads/1780080128228-39500687.jpg'
      AND existing.position = 2
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/jean-wide-leg.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'jean-wide-leg'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/jean-wide-leg.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/chaleco-sastrero.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'chaleco-sastrero'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/chaleco-sastrero.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/sweater-tejido.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'sweater-tejido'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/sweater-tejido.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/blazer-clasico.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'blazer-clasico'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/blazer-clasico.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/pantalon-sastrero.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'pantalon-sastrero'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/pantalon-sastrero.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/remera-basica.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'remera-basica'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/remera-basica.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/buzo-urbano.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'buzo-urbano'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/buzo-urbano.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/vestido-midi.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'vestido-midi'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/vestido-midi.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/campera-de-jean.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'campera-de-jean'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/campera-de-jean.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/blusa-satinada.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'blusa-satinada'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/blusa-satinada.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/images/comovosyyo/products/tote-bag.png', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'tote-bag'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/images/comovosyyo/products/tote-bag.png'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/uploads/1780082889863-939320007.jpg', 0, 0, 0, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'remera-test'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/uploads/1780082889863-939320007.jpg'
      AND existing.position = 0
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/uploads/1780082892230-495623531.jpg', 1, -8.051143564415073, -6.155467907946324, 2.360000000000001
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'remera-test'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/uploads/1780082892230-495623531.jpg'
      AND existing.position = 1
  );
INSERT INTO "ProductImage" ("productId", "url", "position", "offsetX", "offsetY", "zoom")
SELECT p.id, '/uploads/1780082894142-809587986.jpg', 2, -40, -4.716981132075472, 1
FROM "Product" p
WHERE p."storeId" = 7
  AND p.slug = 'remera-test'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductImage" existing
    WHERE existing."productId" = p.id
      AND existing.url = '/uploads/1780082894142-809587986.jpg'
      AND existing.position = 2
  );

-- Variantes e inventario
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BLA-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 64990,
    "weightGrams" = 720,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BLA-S', 64990, 720, NULL, NULL, NULL, NULL, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'S', NULL
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
SELECT tv.id, 7, 1, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BLA-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 65490,
    "weightGrams" = 760,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BLA-M', 65490, 760, NULL, NULL, NULL, NULL, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'M', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BLA-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 65990,
    "weightGrams" = 800,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 30,
    "weight" = 0.8,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BLA-L', 65990, 800, NULL, NULL, NULL, NULL, 30, 0.8, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'L', NULL
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
SELECT tv.id, 11, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BLA-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 66490,
    "weightGrams" = 840,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BLA-XL', 66490, 840, NULL, NULL, NULL, NULL, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'XL', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BEI-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 66490,
    "weightGrams" = 720,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BEI-S', 66490, 720, NULL, NULL, NULL, NULL, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'S', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BEI-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 66990,
    "weightGrams" = 760,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BEI-M', 66990, 760, NULL, NULL, NULL, NULL, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'M', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BEI-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 67490,
    "weightGrams" = 800,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 30,
    "weight" = 0.8,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BEI-L', 67490, 800, NULL, NULL, NULL, NULL, 30, 0.8, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'L', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'camisa-oversize-lino'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-001-BEI-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 67990,
    "weightGrams" = 840,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-001-BEI-XL', 67990, 840, NULL, NULL, NULL, NULL, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'XL', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-JEA-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 78990,
    "weightGrams" = 720,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-JEA-S', 78990, 720, NULL, NULL, NULL, NULL, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'S', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-JEA-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 79490,
    "weightGrams" = 760,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-JEA-M', 79490, 760, NULL, NULL, NULL, NULL, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'M', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-JEA-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 79990,
    "weightGrams" = 800,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 30,
    "weight" = 0.8,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-JEA-L', 79990, 800, NULL, NULL, NULL, NULL, 30, 0.8, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'L', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-JEA-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 80490,
    "weightGrams" = 840,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-JEA-XL', 80490, 840, NULL, NULL, NULL, NULL, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'XL', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-NEG-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 80490,
    "weightGrams" = 720,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-NEG-S', 80490, 720, NULL, NULL, NULL, NULL, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-NEG-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 80990,
    "weightGrams" = 760,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-NEG-M', 80990, 760, NULL, NULL, NULL, NULL, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-NEG-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 81490,
    "weightGrams" = 800,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 30,
    "weight" = 0.8,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-NEG-L', 81490, 800, NULL, NULL, NULL, NULL, 30, 0.8, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-leg'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-002-NEG-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 81990,
    "weightGrams" = 840,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-002-NEG-XL', 81990, 840, NULL, NULL, NULL, NULL, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-BEI-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 69990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-BEI-S', 69990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'S', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-BEI-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 70490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-BEI-M', 70490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'M', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-BEI-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 70990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-BEI-L', 70990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'L', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-BEI-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 71490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-BEI-XL', 71490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'XL', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-NEG-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 71490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-NEG-S', 71490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-NEG-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 71990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-NEG-M', 71990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-NEG-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 72490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-NEG-L', 72490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'chaleco-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-003-NEG-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 72990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-003-NEG-XL', 72990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-VER-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 71990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-VER-S', 71990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'S', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-VER-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 72490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-VER-M', 72490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'M', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-VER-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 72990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-VER-L', 72990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'L', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-VER-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 73490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-VER-XL', 73490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'XL', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-CRU-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 73490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-CRU-S', 73490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Crudo', 'S', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-CRU-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 73990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-CRU-M', 73990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Crudo', 'M', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-CRU-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 74490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-CRU-L', 74490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Crudo', 'L', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'sweater-tejido'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-004-CRU-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 74990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-004-CRU-XL', 74990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Crudo', 'XL', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-NEG-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 98990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-NEG-S', 98990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-NEG-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 99490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-NEG-M', 99490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-NEG-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 99990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-NEG-L', 99990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-NEG-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 100490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-NEG-XL', 100490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-CHO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 100490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-CHO-S', 100490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'S', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-CHO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 100990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-CHO-M', 100990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'M', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-CHO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 101490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-CHO-L', 101490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'L', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blazer-clasico'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-005-CHO-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 101990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-005-CHO-XL', 101990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'XL', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-CHO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 82990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-CHO-S', 82990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'S', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-CHO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 83490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-CHO-M', 83490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'M', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-CHO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 83990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-CHO-L', 83990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'L', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-CHO-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 84490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-CHO-XL', 84490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'XL', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-NEG-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 84490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-NEG-S', 84490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-NEG-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 84990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-NEG-M', 84990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-NEG-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 85490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-NEG-L', 85490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'pantalon-sastrero'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-006-NEG-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 85990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-006-NEG-XL', 85990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-BLA-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 32990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-BLA-S', 32990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'S', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-BLA-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 33490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-BLA-M', 33490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'M', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-BLA-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 33990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-BLA-L', 33990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'L', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-BLA-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 34490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-BLA-XL', 34490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'XL', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-NEG-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 34490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-NEG-S', 34490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-NEG-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 34990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-NEG-M', 34990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-NEG-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 35490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-NEG-L', 35490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-basica'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-007-NEG-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 35990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-007-NEG-XL', 35990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-BEI-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 58990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-BEI-S', 58990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'S', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-BEI-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 59490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-BEI-M', 59490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'M', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-BEI-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 59990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-BEI-L', 59990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'L', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-BEI-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 60490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-BEI-XL', 60490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'XL', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-VER-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 60490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-VER-S', 60490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'S', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-VER-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 60990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-VER-M', 60990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'M', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-VER-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 61490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-VER-L', 61490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'L', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'buzo-urbano'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-008-VER-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 61990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-008-VER-XL', 61990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Verde', 'XL', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-NEG-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 84990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-NEG-S', 84990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-NEG-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 85490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-NEG-M', 85490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-NEG-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 85990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-NEG-L', 85990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-NEG-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 86490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-NEG-XL', 86490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-CHO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 86490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-CHO-S', 86490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'S', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-CHO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 86990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-CHO-M', 86990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'M', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-CHO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 87490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-CHO-L', 87490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'L', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'vestido-midi'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-009-CHO-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 87990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-009-CHO-XL', 87990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'XL', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-JEA-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 89990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-JEA-S', 89990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'S', NULL
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
SELECT tv.id, 14, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-JEA-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 90490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-JEA-M', 90490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'M', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-JEA-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 90990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-JEA-L', 90990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'L', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-JEA-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 91490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-JEA-XL', 91490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Jean', 'XL', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-NEG-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 91490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-NEG-S', 91490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-NEG-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 91990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-NEG-M', 91990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-NEG-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 92490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-NEG-L', 92490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'campera-de-jean'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-010-NEG-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 92990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-010-NEG-XL', 92990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-BLA-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 67990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-BLA-S', 67990, NULL, NULL, NULL, NULL, 6, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'S', NULL
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
SELECT tv.id, 16, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-BLA-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 68490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-BLA-M', 68490, NULL, NULL, NULL, NULL, 6, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'M', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-BLA-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 68990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-BLA-L', 68990, NULL, NULL, NULL, NULL, 6, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'L', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-BLA-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 69490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 6,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-BLA-XL', 69490, NULL, NULL, NULL, NULL, 6, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Blanco', 'XL', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-CHO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 69490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 28,
    "weight" = 0.72,
    "width" = 34,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-CHO-S', 69490, NULL, NULL, NULL, NULL, 7, 28, 0.72, 34, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'S', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-CHO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 69990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 29,
    "weight" = 0.76,
    "width" = 35,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-CHO-M', 69990, NULL, NULL, NULL, NULL, 7, 29, 0.76, 35, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'M', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-CHO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 70490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 30,
    "weight" = 0.7999999999999999,
    "width" = 36,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-CHO-L', 70490, NULL, NULL, NULL, NULL, 7, 30, 0.7999999999999999, 36, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'L', NULL
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
SELECT tv.id, 10, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'blusa-satinada'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-011-CHO-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 70990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 7,
    "length" = 31,
    "weight" = 0.84,
    "width" = 37,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-011-CHO-XL', 70990, NULL, NULL, NULL, NULL, 7, 31, 0.84, 37, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'XL', NULL
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
SELECT tv.id, 12, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'tote-bag'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-012-BEI-UNI'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 45990,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 28,
    "length" = 14,
    "weight" = 0.6,
    "width" = 38,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'Unico',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-012-BEI-UNI', 45990, NULL, NULL, NULL, NULL, 28, 14, 0.6, 38, '2026-05-30T13:20:10.028Z'::timestamp, 'Beige', 'Unico', NULL
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
SELECT tv.id, 18, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'tote-bag'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'CVY-012-CHO-UNI'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 47490,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = 28,
    "length" = 14,
    "weight" = 0.6,
    "width" = 38,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'Unico',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'CVY-012-CHO-UNI', 47490, NULL, NULL, NULL, NULL, 28, 14, 0.6, 38, '2026-05-30T13:20:10.028Z'::timestamp, 'Chocolate', 'Unico', NULL
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
SELECT tv.id, 8, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'REMERA-TEST-NEGRO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 15000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 45,
    "weight" = NULL,
    "width" = 23,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'REMERA-TEST-NEGRO-S', 15000, NULL, NULL, NULL, NULL, NULL, 45, NULL, 23, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 5, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'REMERA-TEST-NEGRO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 15000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 46,
    "weight" = NULL,
    "width" = 23,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'REMERA-TEST-NEGRO-M', 15000, NULL, NULL, NULL, NULL, NULL, 46, NULL, 23, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 3, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'remera-test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'REMERA-TEST-NEGRO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 15000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 47,
    "weight" = NULL,
    "width" = 23,
    "deletedAt" = '2026-05-30T13:20:10.028Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'REMERA-TEST-NEGRO-L', 15000, NULL, NULL, NULL, NULL, NULL, 47, NULL, 23, '2026-05-30T13:20:10.028Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 5, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BLANCO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BLANCO-M', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Blanco', 'M', NULL
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BLANCO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BLANCO-L', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Blanco', 'L', NULL
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BLANCO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BLANCO-S', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Blanco', 'S', NULL
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BLANCO-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Blanco',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BLANCO-XL', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Blanco', 'XL', NULL
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
SELECT tv.id, 3, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BEIGE-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BEIGE-M', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Beige', 'M', NULL
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
SELECT tv.id, 4, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BEIGE-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BEIGE-L', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Beige', 'L', NULL
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BEIGE-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BEIGE-S', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Beige', 'S', NULL
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-BEIGE-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Beige',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-BEIGE-XL', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Beige', 'XL', NULL
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CRUDO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CRUDO-M', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Crudo', 'M', NULL
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CRUDO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CRUDO-L', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Crudo', 'L', NULL
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CRUDO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CRUDO-S', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Crudo', 'S', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CRUDO-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Crudo',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CRUDO-XL', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Crudo', 'XL', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-JEAN-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-JEAN-M', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Jean', 'M', NULL
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-JEAN-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-JEAN-L', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Jean', 'L', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-JEAN-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-JEAN-S', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Jean', 'S', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-JEAN-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Jean',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-JEAN-XL', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Jean', 'XL', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-NEGRO-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-NEGRO-M', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Negro', 'M', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-NEGRO-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-NEGRO-L', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Negro', 'L', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-NEGRO-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-NEGRO-S', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Negro', 'S', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-NEGRO-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Negro',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-NEGRO-XL', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Negro', 'XL', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CHOCOLATE-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CHOCOLATE-M', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Chocolate', 'M', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CHOCOLATE-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CHOCOLATE-L', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Chocolate', 'L', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CHOCOLATE-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CHOCOLATE-S', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Chocolate', 'S', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-CHOCOLATE-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Chocolate',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-CHOCOLATE-XL', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Chocolate', 'XL', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-VERDE-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'M',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-VERDE-M', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Verde', 'M', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-VERDE-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'L',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-VERDE-L', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Verde', 'L', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-VERDE-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'S',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-VERDE-S', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Verde', 'S', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'test'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'TEST-VERDE-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = NULL,
    "weight" = NULL,
    "width" = NULL,
    "deletedAt" = '2026-05-30T13:25:14.522Z'::timestamp,
    "Color" = 'Verde',
    "Size" = 'XL',
    "waistSize" = NULL
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'TEST-VERDE-XL', 115000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-30T13:25:14.522Z'::timestamp, 'Verde', 'XL', NULL
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-barrel-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BARREL--S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 74,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'S',
    "waistSize" = '116'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BARREL--S', 105800, NULL, NULL, NULL, NULL, NULL, 99, NULL, 74, NULL, NULL, 'S', '116'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-barrel-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BARREL--L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 78,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '120'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BARREL--L', 105800, NULL, NULL, NULL, NULL, NULL, 99, NULL, 78, NULL, NULL, 'L', '120'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-ballon-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BALLON--M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 103,
    "weight" = NULL,
    "width" = 112,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '86'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BALLON--M', 105800, NULL, NULL, NULL, NULL, NULL, 103, NULL, 112, NULL, NULL, 'M', '86'
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-ballon-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BALLON--L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 114,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BALLON--L', 105800, NULL, NULL, NULL, NULL, NULL, 104, NULL, 114, NULL, NULL, 'L', '84'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-blue-medio'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD--28'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115200,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 92,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '28',
    "waistSize" = '72'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD--28', 115200, NULL, NULL, NULL, NULL, NULL, 104, NULL, 92, NULL, NULL, '28', '72'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-blue-medio'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD--26'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115200,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 88,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '26',
    "waistSize" = '66'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD--26', 115200, NULL, NULL, NULL, NULL, NULL, 104, NULL, 88, NULL, NULL, '26', '66'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-crop-medio'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGH-26'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 98820,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 90,
    "weight" = NULL,
    "width" = 98,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '26',
    "waistSize" = '76'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGH-26', 98820, NULL, NULL, NULL, NULL, NULL, 90, NULL, 98, NULL, NULL, '26', '76'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-crop-medio'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGH-28'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 98820,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 92,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '28',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGH-28', 98820, NULL, NULL, NULL, NULL, NULL, 92, NULL, 104, NULL, NULL, '28', '80'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-crop-medio'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGH-30'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 98820,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 91,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '30',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGH-30', 98820, NULL, NULL, NULL, NULL, NULL, 91, NULL, 104, NULL, NULL, '30', '84'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-elastizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-36'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 109,
    "weight" = NULL,
    "width" = 112,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '36',
    "waistSize" = '94'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-36', 108100, NULL, NULL, NULL, NULL, NULL, 109, NULL, 112, NULL, NULL, '36', '94'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-elastizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-26'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '26',
    "waistSize" = '76'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-26', 108100, NULL, NULL, NULL, NULL, NULL, 104, NULL, 94, NULL, NULL, '26', '76'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-elastizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-28'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 103,
    "weight" = NULL,
    "width" = 92,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '28',
    "waistSize" = '76'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-28', 108100, NULL, NULL, NULL, NULL, NULL, 103, NULL, 92, NULL, NULL, '28', '76'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-elastizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-30'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 106,
    "weight" = NULL,
    "width" = 100,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '30',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-30', 108100, NULL, NULL, NULL, NULL, NULL, 106, NULL, 100, NULL, NULL, '30', '84'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-barrel'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BARREL-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 103,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'm',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BARREL-M', 105800, NULL, NULL, NULL, NULL, NULL, 103, NULL, 104, NULL, NULL, 'm', '80'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-uva'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 102,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '72'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-L', 105800, NULL, NULL, NULL, NULL, NULL, 102, NULL, 94, NULL, NULL, 'L', '72'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-uva'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-M', 105800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 94, NULL, NULL, 'M', '70'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-uva'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 84,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'S',
    "waistSize" = '68'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-S', 105800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 84, NULL, NULL, 'S', '68'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-L-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 102,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '72'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-L-2', 105800, NULL, NULL, NULL, NULL, NULL, 102, NULL, 94, NULL, NULL, 'L', '72'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-M-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-M-2', 105800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 94, NULL, NULL, 'M', '70'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-S-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 84,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'S',
    "waistSize" = '68'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-S-2', 105800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 84, NULL, NULL, 'S', '68'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 103000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XL',
    "waistSize" = '74'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-XL', 103000, NULL, NULL, NULL, NULL, NULL, 104, NULL, 94, NULL, NULL, 'XL', '74'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-verde'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-L-3'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 103000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 102,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '72'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-L-3', 103000, NULL, NULL, NULL, NULL, NULL, 102, NULL, 94, NULL, NULL, 'L', '72'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-verde'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-M-3'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 103000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-M-3', 103000, NULL, NULL, NULL, NULL, NULL, 101, NULL, 94, NULL, NULL, 'M', '70'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-verde'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-XL-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 103000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XL',
    "waistSize" = '74'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-XL-2', 103000, NULL, NULL, NULL, NULL, NULL, 104, NULL, 94, NULL, NULL, 'XL', '74'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-relax-verde'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-RELAX-XS'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 103000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 100,
    "weight" = NULL,
    "width" = 78,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XS',
    "waistSize" = '64'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-RELAX-XS', 103000, NULL, NULL, NULL, NULL, NULL, 100, NULL, 78, NULL, NULL, 'XS', '64'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-negro'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGH-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'S',
    "waistSize" = '72'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGH-S', 108100, NULL, NULL, NULL, NULL, NULL, 99, NULL, 94, NULL, NULL, 'S', '72'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-negro'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGH-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 98,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '72'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGH-M', 108100, NULL, NULL, NULL, NULL, NULL, 99, NULL, 98, NULL, NULL, 'M', '72'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-negro'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGH-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGH-L', 108100, NULL, NULL, NULL, NULL, NULL, 101, NULL, 104, NULL, NULL, 'L', '80'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-negro'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGH-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 108,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XL',
    "waistSize" = '82'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGH-XL', 108100, NULL, NULL, NULL, NULL, NULL, 101, NULL, 108, NULL, NULL, 'XL', '82'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-matizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-32'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 116500,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 103,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '32',
    "waistSize" = '82'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-32', 116500, NULL, NULL, NULL, NULL, NULL, 103, NULL, 104, NULL, NULL, '32', '82'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-matizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-28'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 116500,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 103,
    "weight" = NULL,
    "width" = 98,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '28',
    "waistSize" = '76'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-28', 116500, NULL, NULL, NULL, NULL, NULL, 103, NULL, 98, NULL, NULL, '28', '76'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-matizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-30'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 116500,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 102,
    "weight" = NULL,
    "width" = 102,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '30',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-30', 116500, NULL, NULL, NULL, NULL, NULL, 102, NULL, 102, NULL, NULL, '30', '80'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-stright-print-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRIGHT-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 98,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'S',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRIGHT-S', 105800, NULL, NULL, NULL, NULL, NULL, 98, NULL, 104, NULL, NULL, 'S', '70'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-stright-print-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRIGHT-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 100,
    "weight" = NULL,
    "width" = 106,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '74'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRIGHT-M', 105800, NULL, NULL, NULL, NULL, NULL, 100, NULL, 106, NULL, NULL, 'M', '74'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-stright-print-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRIGHT-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 112,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '78'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRIGHT-L', 105800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 112, NULL, NULL, 'L', '78'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-stright-print-chocolate'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRIGHT-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 102,
    "weight" = NULL,
    "width" = 118,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XL',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRIGHT-XL', 105800, NULL, NULL, NULL, NULL, NULL, 102, NULL, 118, NULL, NULL, 'XL', '84'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-matizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-WIDE-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115200,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 110,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XL',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-WIDE-XL', 115200, NULL, NULL, NULL, NULL, NULL, 110, NULL, 104, NULL, NULL, 'XL', '80'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-matizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-WIDE-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115200,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-WIDE-M', 115200, NULL, NULL, NULL, NULL, NULL, 104, NULL, 94, NULL, NULL, 'M', '70'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-wide-matizado'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-WIDE-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 115200,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 108,
    "weight" = NULL,
    "width" = 100,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '78'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-WIDE-L', 115200, NULL, NULL, NULL, NULL, NULL, 108, NULL, 100, NULL, NULL, 'L', '78'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-26'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 91800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 100,
    "weight" = NULL,
    "width" = 92,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '26',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-26', 91800, NULL, NULL, NULL, NULL, NULL, 100, NULL, 92, NULL, NULL, '26', '70'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-30-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 91800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '30',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-30-2', 91800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 104, NULL, NULL, '30', '80'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-blue-tiro-medio'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-26-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 94,
    "weight" = NULL,
    "width" = 102,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '26',
    "waistSize" = '74'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-26-2', 108100, NULL, NULL, NULL, NULL, NULL, 94, NULL, 102, NULL, NULL, '26', '74'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-blue-tiro-medio'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-34'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 94,
    "weight" = NULL,
    "width" = 114,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '34',
    "waistSize" = '88'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-34', 108100, NULL, NULL, NULL, NULL, NULL, 94, NULL, 114, NULL, NULL, '34', '88'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-blue-normal'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-32-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 114,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '32',
    "waistSize" = '90'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-32-2', 105800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 114, NULL, NULL, '32', '90'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-blue-normal'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-34-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 116,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '34',
    "waistSize" = '94'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-34-2', 105800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 116, NULL, NULL, '34', '94'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-straight-blue-normal'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-STRAIGHT-28-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '28',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-STRAIGHT-28-2', 105800, NULL, NULL, NULL, NULL, NULL, 99, NULL, 104, NULL, NULL, '28', '80'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-carrot-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-CARROT-XS'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 94000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 94,
    "weight" = NULL,
    "width" = 100,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XS',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-CARROT-XS', 94000, NULL, NULL, NULL, NULL, NULL, 94, NULL, 100, NULL, NULL, 'XS', '70'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-carrot-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-CARROT-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 94000,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 96,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'S',
    "waistSize" = '76'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-CARROT-S', 94000, NULL, NULL, NULL, NULL, NULL, 96, NULL, 104, NULL, NULL, 'S', '76'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-light-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-28-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 106,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '28',
    "waistSize" = '74'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-28-2', 105800, NULL, NULL, NULL, NULL, NULL, 106, NULL, 94, NULL, NULL, '28', '74'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-light-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-30-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 98,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '30',
    "waistSize" = '78'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-30-2', 105800, NULL, NULL, NULL, NULL, NULL, 104, NULL, 98, NULL, NULL, '30', '78'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-light-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-36-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 111,
    "weight" = NULL,
    "width" = 112,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '36',
    "waistSize" = '92'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-36-2', 105800, NULL, NULL, NULL, NULL, NULL, 111, NULL, 112, NULL, NULL, '36', '92'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-oxford-light-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-OXFORD-32'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 109,
    "weight" = NULL,
    "width" = 102,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '32',
    "waistSize" = '82'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-OXFORD-32', 105800, NULL, NULL, NULL, NULL, NULL, 109, NULL, 102, NULL, NULL, '32', '82'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-bootcut-black-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BOOTCUT-24'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 100,
    "weight" = NULL,
    "width" = 88,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '24',
    "waistSize" = '72'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BOOTCUT-24', 108100, NULL, NULL, NULL, NULL, NULL, 100, NULL, 88, NULL, NULL, '24', '72'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-bootcut-black-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BOOTCUT-26'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 90,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '26',
    "waistSize" = '78'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BOOTCUT-26', 108100, NULL, NULL, NULL, NULL, NULL, 101, NULL, 90, NULL, NULL, '26', '78'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-bootcut-black-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BOOTCUT-28'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 96,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '28',
    "waistSize" = '82'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BOOTCUT-28', 108100, NULL, NULL, NULL, NULL, NULL, 101, NULL, 96, NULL, NULL, '28', '82'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-bootcut-black-grey'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BOOTCUT-34'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 108100,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 104,
    "weight" = NULL,
    "width" = 106,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '34',
    "waistSize" = '90'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BOOTCUT-34', 108100, NULL, NULL, NULL, NULL, NULL, 104, NULL, 106, NULL, NULL, '34', '90'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-barrel-military'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BARREL-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 111800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 98,
    "weight" = NULL,
    "width" = 102,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'S',
    "waistSize" = '74'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BARREL-S', 111800, NULL, NULL, NULL, NULL, NULL, 98, NULL, 102, NULL, NULL, 'S', '74'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-barrel-military'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BARREL-M-2'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 111800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 98,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'M',
    "waistSize" = '78'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BARREL-M-2', 111800, NULL, NULL, NULL, NULL, NULL, 98, NULL, 104, NULL, NULL, 'M', '78'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-barrel-military'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BARREL-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 111800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 101,
    "weight" = NULL,
    "width" = 108,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'L',
    "waistSize" = '82'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BARREL-L', 111800, NULL, NULL, NULL, NULL, NULL, 101, NULL, 108, NULL, NULL, 'L', '82'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-barrel-military'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BARREL-XL'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 111800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 102,
    "weight" = NULL,
    "width" = 110,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = 'XL',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BARREL-XL', 111800, NULL, NULL, NULL, NULL, NULL, 102, NULL, 110, NULL, NULL, 'XL', '84'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-MILITAR-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 97,
    "weight" = NULL,
    "width" = 108,
    "deletedAt" = NULL,
    "Color" = 'Militar',
    "Size" = 'S',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-MILITAR-S', 105800, NULL, NULL, NULL, NULL, NULL, 97, NULL, 108, NULL, 'Militar', 'S', '80'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-MILITAR-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 98,
    "weight" = NULL,
    "width" = 116,
    "deletedAt" = NULL,
    "Color" = 'Militar',
    "Size" = 'M',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-MILITAR-M', 105800, NULL, NULL, NULL, NULL, NULL, 98, NULL, 116, NULL, 'Militar', 'M', '84'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-MILITAR-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 120,
    "deletedAt" = NULL,
    "Color" = 'Militar',
    "Size" = 'L',
    "waistSize" = '88'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-MILITAR-L', 105800, NULL, NULL, NULL, NULL, NULL, 99, NULL, 120, NULL, 'Militar', 'L', '88'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-CHOCOLATE-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 97,
    "weight" = NULL,
    "width" = 108,
    "deletedAt" = NULL,
    "Color" = 'Chocolate',
    "Size" = 'S',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-CHOCOLATE-S', 105800, NULL, NULL, NULL, NULL, NULL, 97, NULL, 108, NULL, 'Chocolate', 'S', '80'
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
SELECT tv.id, 2, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-CHOCOLATE-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 98,
    "weight" = NULL,
    "width" = 116,
    "deletedAt" = NULL,
    "Color" = 'Chocolate',
    "Size" = 'M',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-CHOCOLATE-M', 105800, NULL, NULL, NULL, NULL, NULL, 98, NULL, 116, NULL, 'Chocolate', 'M', '84'
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-CHOCOLATE-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 120,
    "deletedAt" = NULL,
    "Color" = 'Chocolate',
    "Size" = 'L',
    "waistSize" = '88'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-CHOCOLATE-L', 105800, NULL, NULL, NULL, NULL, NULL, 99, NULL, 120, NULL, 'Chocolate', 'L', '88'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-VISON-S'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 97,
    "weight" = NULL,
    "width" = 108,
    "deletedAt" = NULL,
    "Color" = 'Vison',
    "Size" = 'S',
    "waistSize" = '80'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-VISON-S', 105800, NULL, NULL, NULL, NULL, NULL, 97, NULL, 108, NULL, 'Vison', 'S', '80'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-VISON-M'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 98,
    "weight" = NULL,
    "width" = 116,
    "deletedAt" = NULL,
    "Color" = 'Vison',
    "Size" = 'M',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-VISON-M', 105800, NULL, NULL, NULL, NULL, NULL, 98, NULL, 116, NULL, 'Vison', 'M', '84'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-baggy-vison'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-BAGGY-VISON-L'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 105800,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 99,
    "weight" = NULL,
    "width" = 120,
    "deletedAt" = NULL,
    "Color" = 'Vison',
    "Size" = 'L',
    "waistSize" = '88'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-BAGGY-VISON-L', 105800, NULL, NULL, NULL, NULL, NULL, 99, NULL, 120, NULL, 'Vison', 'L', '88'
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
SELECT tv.id, 0, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-slim-flare-dark-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-SLIM-32'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 104700,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 109,
    "weight" = NULL,
    "width" = 104,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '32',
    "waistSize" = '82'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-SLIM-32', 104700, NULL, NULL, NULL, NULL, NULL, 109, NULL, 104, NULL, NULL, '32', '82'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-slim-flare-dark-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-SLIM-36'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 104700,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 107,
    "weight" = NULL,
    "width" = 112,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '36',
    "waistSize" = '96'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-SLIM-36', 104700, NULL, NULL, NULL, NULL, NULL, 107, NULL, 112, NULL, NULL, '36', '96'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-slim-flare-dark-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-SLIM-34'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 104700,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 110,
    "weight" = NULL,
    "width" = 100,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '34',
    "waistSize" = '84'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-SLIM-34', 104700, NULL, NULL, NULL, NULL, NULL, 110, NULL, 100, NULL, NULL, '34', '84'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-slim-flare-dark-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-SLIM-30'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 104700,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 109,
    "weight" = NULL,
    "width" = 94,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '30',
    "waistSize" = '76'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-SLIM-30', 104700, NULL, NULL, NULL, NULL, NULL, 109, NULL, 94, NULL, NULL, '30', '76'
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
SELECT tv.id, 1, 0, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();
WITH product_row AS (
  SELECT id FROM "Product" WHERE "storeId" = 7 AND slug = 'jean-slim-flare-dark-blue'
),
existing_variant AS (
  SELECT v.id
  FROM "ProductVariant" v
  JOIN product_row p ON p.id = v."productId"
  WHERE v.sku = 'JEAN-SLIM-24'
  LIMIT 1
),
updated_variant AS (
  UPDATE "ProductVariant" v SET
    "price" = 104700,
    "weightGrams" = NULL,
    "packageHeightCm" = NULL,
    "packageWidthCm" = NULL,
    "packageLengthCm" = NULL,
    "height" = NULL,
    "length" = 107,
    "weight" = NULL,
    "width" = 84,
    "deletedAt" = NULL,
    "Color" = NULL,
    "Size" = '24',
    "waistSize" = '70'
  WHERE v.id IN (SELECT id FROM existing_variant)
  RETURNING v.id
),
inserted_variant AS (
  INSERT INTO "ProductVariant" ("productId", "sku", "price", "weightGrams", "packageHeightCm", "packageWidthCm", "packageLengthCm", "height", "length", "weight", "width", "deletedAt", "Color", "Size", "waistSize")
  SELECT p.id, 'JEAN-SLIM-24', 104700, NULL, NULL, NULL, NULL, NULL, 107, NULL, 84, NULL, NULL, '24', '70'
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
SELECT tv.id, 1, 1, NOW(), 7
FROM target_variant tv
ON CONFLICT ("storeId", "variantId") DO UPDATE SET
  "quantity" = EXCLUDED."quantity",
  "reserved" = EXCLUDED."reserved",
  "updatedAt" = NOW();

COMMIT;
