import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isGiftCardProduct } from '../../common/gift-card-product';
import { PrismaService } from '../../prisma/prisma.service';
import type { InventoryMovementType } from '../../common/inventory-types';

export type InventoryMovementActor = { sub?: number | string; email?: string; name?: string };

export type InventoryMovementContext = {
  type: InventoryMovementType;
  origin: string;
  actor?: InventoryMovementActor | null;
  referenceType?: string | null;
  referenceId?: number | null;
  reason?: string | null;
  idempotencyKey?: string | null;
  approximate?: boolean;
  metadata?: unknown;
};

export type InventorySnapshot = {
  id: number;
  storeId: number;
  variantId: number;
  quantity: number;
  reserved: number;
};

@Injectable()
export class InventoryMovementService {
  constructor(private readonly prisma: PrismaService) {}

  async lockInventoryTx(tx: Prisma.TransactionClient, storeId: number, variantId: number): Promise<InventorySnapshot> {
    const rows = await tx.$queryRaw<InventorySnapshot[]>(Prisma.sql`
      SELECT "id", "storeId", "variantId", "quantity", "reserved"
      FROM "Inventory"
      WHERE "variantId" = ${variantId} AND "storeId" = ${storeId}
      FOR UPDATE
    `);
    if (!rows.length) throw new BadRequestException('Inventory not found');
    return rows[0];
  }

  async setQuantityTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number, context: InventoryMovementContext) {
    const before = await this.lockInventoryTx(tx, storeId, variantId);
    if (await this.findIdempotentMovementTx(tx, storeId, context.idempotencyKey)) return before;
    if (quantity < before.reserved) throw new BadRequestException('Stock cannot be lower than reserved quantity');
    if (quantity === before.quantity) return before;
    if (context.type === 'STOCK_RECEIPT' && quantity < before.quantity) {
      throw new BadRequestException('A stock receipt must increase the current quantity');
    }
    const after = await tx.inventory.update({ where: { storeId_variantId: { storeId, variantId } }, data: { quantity } });
    await this.recordTransitionTx(tx, before, after, context);
    return after;
  }

  async adjustTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantityDelta: number, reservedDelta: number, context: InventoryMovementContext) {
    if (quantityDelta === 0 && reservedDelta === 0) return this.lockInventoryTx(tx, storeId, variantId);
    const before = await this.lockInventoryTx(tx, storeId, variantId);
    if (await this.findIdempotentMovementTx(tx, storeId, context.idempotencyKey)) return before;
    const quantityAfter = before.quantity + quantityDelta;
    const reservedAfter = before.reserved + reservedDelta;
    if (quantityAfter < 0 || reservedAfter < 0 || reservedAfter > quantityAfter) throw new BadRequestException('Invalid inventory movement');
    const after = await tx.inventory.update({ where: { storeId_variantId: { storeId, variantId } }, data: { quantity: quantityAfter, reserved: reservedAfter } });
    await this.recordTransitionTx(tx, before, after, context);
    return after;
  }

  recordCreatedTx(tx: Prisma.TransactionClient, inventory: InventorySnapshot, context: InventoryMovementContext) {
    return this.recordTransitionTx(tx, { ...inventory, quantity: 0, reserved: 0 }, inventory, context);
  }

  async recordTransitionTx(tx: Prisma.TransactionClient, before: InventorySnapshot, after: InventorySnapshot, context: InventoryMovementContext) {
    const quantityDelta = after.quantity - before.quantity;
    const reservedDelta = after.reserved - before.reserved;
    if (quantityDelta === 0 && reservedDelta === 0) return null;
    if (context.idempotencyKey) {
      const existing = await (tx as any).inventoryMovement.findUnique({
        where: { storeId_idempotencyKey: { storeId: after.storeId, idempotencyKey: context.idempotencyKey } },
      });
      if (existing) return existing;
    }
    const actorUserId = Number(context.actor?.sub);
    return (tx as any).inventoryMovement.create({
      data: {
        storeId: after.storeId,
        variantId: after.variantId,
        actorUserId: Number.isInteger(actorUserId) && actorUserId > 0 ? actorUserId : null,
        actorEmail: context.actor?.email ?? null,
        actorName: context.actor?.name ?? null,
        type: context.type,
        origin: context.origin,
        referenceType: context.referenceType ?? null,
        referenceId: context.referenceId ?? null,
        reason: context.reason?.trim() || null,
        quantityDelta,
        reservedDelta,
        quantityBefore: before.quantity,
        quantityAfter: after.quantity,
        reservedBefore: before.reserved,
        reservedAfter: after.reserved,
        approximate: context.approximate ?? false,
        idempotencyKey: context.idempotencyKey ?? null,
        metadata: this.toJson(context.metadata),
      },
    });
  }

  private findIdempotentMovementTx(tx: Prisma.TransactionClient, storeId: number, idempotencyKey?: string | null) {
    if (!idempotencyKey) return Promise.resolve(null);
    return (tx as any).inventoryMovement.findUnique({
      where: { storeId_idempotencyKey: { storeId, idempotencyKey } },
    });
  }

  async list(storeId: number, query: Record<string, string | undefined>) {
    const page = this.positiveInt(query.page, 1, 10_000);
    const pageSize = this.positiveInt(query.pageSize, 30, 100);
    const where: any = {
      storeId,
      ...(query.productId ? { variant: { productId: Number(query.productId) } } : {}),
      ...(query.variantId ? { variantId: Number(query.variantId) } : {}),
      ...(query.type ? { type: query.type as InventoryMovementType } : {}),
      ...(query.origin ? { origin: query.origin } : {}),
      ...(query.actorUserId ? { actorUserId: Number(query.actorUserId) } : {}),
      ...((query.dateFrom || query.dateTo) ? {
        createdAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      } : {}),
    };
    const [items, total] = await Promise.all([
      (this.prisma as any).inventoryMovement.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              Color: true,
              Size: true,
              waistSize: true,
              product: { select: { id: true, title: true, inventoryPolicy: true } },
            },
          },
          actorUser: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      (this.prisma as any).inventoryMovement.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async analytics(storeId: number, query: Record<string, string | undefined>) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      WITH historical_sales AS (
        SELECT oi."variantId",
          MAX(o."createdAt") AS "lastOrderSaleAt",
          COALESCE(SUM(oi.quantity - oi."returnedQuantity") FILTER (WHERE o."createdAt" >= NOW() - INTERVAL '30 days'), 0)::int AS "sold30",
          COALESCE(SUM(oi.quantity - oi."returnedQuantity") FILTER (WHERE o."createdAt" >= NOW() - INTERVAL '60 days'), 0)::int AS "sold60",
          COALESCE(SUM(oi.quantity - oi."returnedQuantity") FILTER (WHERE o."createdAt" >= NOW() - INTERVAL '90 days'), 0)::int AS "sold90"
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        WHERE o."storeId" = ${storeId}
          AND o.status::text IN ('paid','processing','packed','ready_for_pickup','picked_up','shipped','delivered')
          AND o."deletedAt" IS NULL
        GROUP BY oi."variantId"
      ), movement_sales AS (
        SELECT "variantId", MAX("createdAt") AS "lastMovementSaleAt"
        FROM "InventoryMovement"
        WHERE "storeId" = ${storeId}
          AND "quantityDelta" < 0
          AND type IN ('SALE', 'TRIAL_SALE')
        GROUP BY "variantId"
      ), movement_totals AS (
        SELECT "variantId",
          COALESCE(SUM(-"quantityDelta") FILTER (WHERE "quantityDelta" < 0), 0)::int AS consumed,
          MAX("createdAt") FILTER (WHERE "quantityDelta" <> 0) AS "lastStockChangeAt"
        FROM "InventoryMovement"
        WHERE "storeId" = ${storeId}
        GROUP BY "variantId"
      ), first_known_stock AS (
        SELECT DISTINCT ON (m."variantId") m."variantId",
          CASE WHEN m.type = 'OPENING_BALANCE' THEN LEAST(m."createdAt", p."createdAt") ELSE m."createdAt" END AS "firstKnownStockAt",
          (m.approximate OR m.type = 'OPENING_BALANCE') AS "firstKnownStockApproximate"
        FROM "InventoryMovement" m
        JOIN "ProductVariant" v ON v.id = m."variantId"
        JOIN "Product" p ON p.id = v."productId"
        WHERE m."storeId" = ${storeId} AND m."quantityDelta" > 0
          AND m.type IN ('OPENING_BALANCE', 'INITIAL_LOAD', 'STOCK_RECEIPT', 'RETURN_RESTOCK', 'CANCELLATION_RESTOCK')
        ORDER BY m."variantId",
          CASE WHEN m.type = 'OPENING_BALANCE' THEN LEAST(m."createdAt", p."createdAt") ELSE m."createdAt" END,
          m.id
      ), last_restock AS (
        SELECT "variantId", MAX("createdAt") AS "lastRestockAt"
        FROM "InventoryMovement"
        WHERE "storeId" = ${storeId} AND "quantityDelta" > 0
          AND type IN ('INITIAL_LOAD', 'STOCK_RECEIPT')
        GROUP BY "variantId"
      ), inbound_layers AS (
        SELECT m.id, m."variantId",
          CASE WHEN m.type = 'OPENING_BALANCE' THEN LEAST(m."createdAt", p."createdAt") ELSE m."createdAt" END AS "createdAt",
          (m.approximate OR m.type IN ('OPENING_BALANCE', 'MANUAL_ADJUSTMENT', 'SYSTEM_CORRECTION', 'ORDER_EDIT')) AS approximate,
          m."quantityDelta",
          SUM(m."quantityDelta") OVER (
            PARTITION BY m."variantId"
            ORDER BY CASE WHEN m.type = 'OPENING_BALANCE' THEN LEAST(m."createdAt", p."createdAt") ELSE m."createdAt" END, m.id
          ) AS cumulative_inbound
        FROM "InventoryMovement" m
        JOIN "ProductVariant" v ON v.id = m."variantId"
        JOIN "Product" p ON p.id = v."productId"
        WHERE m."storeId" = ${storeId} AND m."quantityDelta" > 0
      ), remaining_layers AS (
        SELECT l.*,
          GREATEST(0, l.cumulative_inbound - COALESCE(t.consumed, 0))
            - GREATEST(0, l.cumulative_inbound - l."quantityDelta" - COALESCE(t.consumed, 0)) AS "remainingUnits"
        FROM inbound_layers l
        LEFT JOIN movement_totals t ON t."variantId" = l."variantId"
      ), remaining_layers_running AS (
        SELECT l.*,
          SUM(l."remainingUnits") OVER (PARTITION BY l."variantId" ORDER BY l."createdAt", l.id) AS cumulative_remaining
        FROM remaining_layers l
        WHERE l."remainingUnits" > 0
      ), available_layers AS (
        SELECT l.*, GREATEST(0, l.cumulative_remaining - COALESCE(i.reserved, 0))
          - GREATEST(0, l.cumulative_remaining - l."remainingUnits" - COALESCE(i.reserved, 0)) AS "availableUnits"
        FROM remaining_layers_running l
        LEFT JOIN "Inventory" i ON i."variantId" = l."variantId" AND i."storeId" = ${storeId}
      ), remaining_age AS (
        SELECT l."variantId",
          MIN(l."createdAt") FILTER (WHERE l."availableUnits" > 0) AS "oldestStockAt",
          BOOL_OR(l.approximate) FILTER (WHERE l."availableUnits" > 0) AS "ageApproximate",
          COALESCE(SUM(l."availableUnits") FILTER (WHERE l."createdAt" > NOW() - INTERVAL '90 days'), 0)::int AS "units0To90",
          COALESCE(SUM(l."availableUnits") FILTER (WHERE l."createdAt" <= NOW() - INTERVAL '90 days' AND l."createdAt" > NOW() - INTERVAL '180 days'), 0)::int AS "units90To180",
          COALESCE(SUM(l."availableUnits") FILTER (WHERE l."createdAt" <= NOW() - INTERVAL '180 days' AND l."createdAt" > NOW() - INTERVAL '365 days'), 0)::int AS "units181To365",
          COALESCE(SUM(l."availableUnits") FILTER (WHERE l."createdAt" <= NOW() - INTERVAL '365 days'), 0)::int AS "unitsOver365"
        FROM available_layers l
        GROUP BY l."variantId"
      )
      SELECT p.id AS "productId", p.title, p.brand, p.published, p."createdAt" AS "productCreatedAt",
        p."inventoryPolicy"::text AS "inventoryPolicy", p."lowStockThreshold",
        COALESCE(SUM(i.quantity), 0)::int AS "onHand",
        COALESCE(SUM(i.reserved), 0)::int AS reserved,
        COALESCE(SUM(i.quantity - i.reserved), 0)::int AS available,
        COALESCE(SUM((i.quantity - i.reserved) * v.price), 0)::numeric AS "retailValue",
        COALESCE(SUM(h."sold30"), 0)::int AS "sold30",
        COALESCE(SUM(h."sold60"), 0)::int AS "sold60",
        COALESCE(SUM(h."sold90"), 0)::int AS "sold90",
        MAX(ms."lastMovementSaleAt") AS "lastMovementSaleAt",
        MAX(h."lastOrderSaleAt") AS "lastOrderSaleAt",
        MAX(t."lastStockChangeAt") AS "lastStockChangeAt",
        MIN(f."firstKnownStockAt") AS "firstKnownStockAt",
        BOOL_OR(COALESCE(f."firstKnownStockApproximate", false)) AS "firstKnownStockApproximate",
        MAX(r."lastRestockAt") AS "lastRestockAt",
        MIN(a."oldestStockAt") FILTER (WHERE i.quantity > 0) AS "oldestStockAt",
        BOOL_OR(COALESCE(a."ageApproximate", false)) FILTER (WHERE i.quantity > 0) AS "ageApproximate",
        COALESCE(SUM(a."units0To90"), 0)::int AS "units0To90",
        COALESCE(SUM(a."units90To180"), 0)::int AS "units90To180",
        COALESCE(SUM(a."units181To365"), 0)::int AS "units181To365",
        COALESCE(SUM(a."unitsOver365"), 0)::int AS "unitsOver365",
        COALESCE(SUM(a."units0To90" * v.price), 0)::numeric AS "value0To90",
        COALESCE(SUM(a."units90To180" * v.price), 0)::numeric AS "value90To180",
        COALESCE(SUM(a."units181To365" * v.price), 0)::numeric AS "value181To365",
        COALESCE(SUM(a."unitsOver365" * v.price), 0)::numeric AS "valueOver365",
        STRING_AGG(v.sku, ' ') AS skus,
        ARRAY(SELECT pc."categoryId" FROM "ProductCategory" pc WHERE pc."productId" = p.id) AS "categoryIds"
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id AND v."deletedAt" IS NULL
      LEFT JOIN "Inventory" i ON i."variantId" = v.id AND i."storeId" = p."storeId"
      LEFT JOIN historical_sales h ON h."variantId" = v.id
      LEFT JOIN movement_sales ms ON ms."variantId" = v.id
      LEFT JOIN movement_totals t ON t."variantId" = v.id
      LEFT JOIN first_known_stock f ON f."variantId" = v.id
      LEFT JOIN last_restock r ON r."variantId" = v.id
      LEFT JOIN remaining_age a ON a."variantId" = v.id
      WHERE p."storeId" = ${storeId} AND p."deletedAt" IS NULL
      GROUP BY p.id
    `);

    const normalized = rows.map((row) => this.normalizeAnalyticsRow(row));
    // Gift cards are a payment instrument, not physical merchandise. Keep the
    // defensive check for existing records and mark new ones UNTRACKED at save time.
    const included = normalized.filter((row) =>
      row.inventoryPolicy !== 'UNTRACKED' && !isGiftCardProduct(row.title, row.skus),
    );
    const filtered = this.filterAnalyticsRows(included, query)
      .map((row) => ({ ...row, immobilizedValue: this.immobilizedValue(row, query) }));
    const sorted = this.sortAnalyticsRows(filtered, query.sortBy, query.sortDirection);
    const page = this.positiveInt(query.page, 1, 10_000);
    const pageSize = query.exportAll === 'true' ? Math.max(1, sorted.length) : this.positiveInt(query.pageSize, 40, 120);
    const withStock = included.filter((row) => row.available > 0);
    const actionable = included.filter((row) => row.published && row.inventoryPolicy === 'RESTOCK');
    const oldProducts = withStock.filter((row) => row.aged180Units > 0);
    const noRecentSales = withStock.filter((row) => !row.lastSaleAt || row.noSaleDays! >= 90);
    const overOneYear = withStock.filter((row) => row.aged365Units > 0);
    return {
      summary: {
        products: included.length,
        productsWithStock: withStock.length,
        onHand: included.reduce((sum, row) => sum + row.onHand, 0),
        reserved: included.reduce((sum, row) => sum + row.reserved, 0),
        available: included.reduce((sum, row) => sum + row.available, 0),
        retailValue: included.reduce((sum, row) => sum + row.retailValue, 0),
        withoutStock: actionable.filter((row) => row.available <= 0).length,
        lowStock: actionable.filter((row) => row.available > 0 && row.available <= row.lowStockThreshold).length,
        unclassified: included.filter((row) => row.inventoryPolicy === 'UNCLASSIFIED').length,
        oldProducts: oldProducts.length,
        oldStockValue: oldProducts.reduce((sum, row) => sum + row.aged180Value, 0),
        noSales30: withStock.filter((row) => !row.lastSaleAt || row.noSaleDays! >= 30).length,
        noSales60: withStock.filter((row) => !row.lastSaleAt || row.noSaleDays! >= 60).length,
        noSales90: noRecentSales.length,
        noRecentSalesValue: noRecentSales.reduce((sum, row) => sum + row.retailValue, 0),
        overOneYear: overOneYear.length,
        overOneYearValue: overOneYear.reduce((sum, row) => sum + row.aged365Value, 0),
      },
      agingBuckets: [
        { key: '0-90', label: 'Menos de 3 meses', products: withStock.filter((row) => row.ageDays !== null && row.ageDays < 90).length, value: included.reduce((sum, row) => sum + row.value0To90, 0) },
        { key: '90-180', label: 'Entre 3 y 6 meses', products: withStock.filter((row) => row.ageDays !== null && row.ageDays >= 90 && row.ageDays < 180).length, value: included.reduce((sum, row) => sum + row.value90To180, 0) },
        { key: '181-365', label: 'Entre 6 y 12 meses', products: withStock.filter((row) => row.ageDays !== null && row.ageDays >= 180 && row.ageDays < 365).length, value: included.reduce((sum, row) => sum + row.value181To365, 0) },
        { key: '365+', label: 'Mas de un ano', products: withStock.filter((row) => row.ageDays !== null && row.ageDays >= 365).length, value: included.reduce((sum, row) => sum + row.valueOver365, 0) },
      ],
      items: sorted.slice((page - 1) * pageSize, page * pageSize),
      total: sorted.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    };
  }

  async analyticsCsv(storeId: number, query: Record<string, string | undefined>) {
    const result = await this.analytics(storeId, { ...query, page: '1', exportAll: 'true' });
    const header = ['Producto','Marca','SKU','Stock disponible','Valor del stock','Producto creado','Primer ingreso conocido','Primer ingreso estimado','Ultima reposicion','Ultima venta','Ultima venta estimada','Tiempo en stock (dias)','Antiguedad estimada','Valor inmovilizado'];
    const lines = result.items.map((row) => [row.title,row.brand ?? '',row.skus,row.available,row.retailValue,row.productCreatedAt ?? '',row.firstKnownStockAt ?? '',row.firstKnownStockApproximate ? 'Si' : 'No',row.lastRestockAt ?? '',row.lastSaleAt ?? '',row.lastSaleEstimated ? 'Si' : 'No',row.ageDays ?? '',row.ageApproximate ? 'Si' : 'No',row.immobilizedValue]);
    return [header, ...lines].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  private normalizeAnalyticsRow(row: Record<string, unknown>) {
    const onHand = Number(row.onHand ?? 0);
    const sold90 = Number(row.sold90 ?? 0);
    const lastMovementSaleAt = row.lastMovementSaleAt ? new Date(String(row.lastMovementSaleAt)).toISOString() : null;
    const lastOrderSaleAt = row.lastOrderSaleAt ? new Date(String(row.lastOrderSaleAt)).toISOString() : null;
    // Inventory movements are the authoritative timestamp: they record when
    // confirmed stock was actually reduced. Orders are only a historical
    // fallback for stock changes that predate the movement ledger.
    const lastSaleAt = lastMovementSaleAt ?? lastOrderSaleAt;
    const oldestStockAt = row.oldestStockAt ? new Date(String(row.oldestStockAt)).toISOString() : null;
    const days = (value: string | null) => value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)) : null;
    return {
      productId: Number(row.productId), title: String(row.title), brand: row.brand ? String(row.brand) : null,
      productCreatedAt: row.productCreatedAt ? new Date(String(row.productCreatedAt)).toISOString() : null,
      published: Boolean(row.published), inventoryPolicy: String(row.inventoryPolicy), lowStockThreshold: Number(row.lowStockThreshold ?? 3),
      onHand, reserved: Number(row.reserved ?? 0), available: Number(row.available ?? 0), retailValue: Number(row.retailValue ?? 0),
      sold30: Number(row.sold30 ?? 0), sold60: Number(row.sold60 ?? 0), sold90,
      lastSaleAt, lastSaleEstimated: Boolean(!lastMovementSaleAt && lastOrderSaleAt),
      firstKnownStockAt: row.firstKnownStockAt ? new Date(String(row.firstKnownStockAt)).toISOString() : null,
      firstKnownStockApproximate: Boolean(row.firstKnownStockApproximate),
      lastRestockAt: row.lastRestockAt ? new Date(String(row.lastRestockAt)).toISOString() : null,
      lastLoadAt: row.lastRestockAt ? new Date(String(row.lastRestockAt)).toISOString() : null,
      lastStockChangeAt: row.lastStockChangeAt ? new Date(String(row.lastStockChangeAt)).toISOString() : null,
      oldestStockAt, ageApproximate: Boolean(row.ageApproximate), ageDays: days(oldestStockAt), noSaleDays: days(lastSaleAt),
      turnoverPerDay: Number((sold90 / 90).toFixed(2)), sellThrough: sold90 + onHand > 0 ? Number((sold90 * 100 / (sold90 + onHand)).toFixed(1)) : 0,
      units0To90: Number(row.units0To90 ?? 0), units90To180: Number(row.units90To180 ?? 0),
      units181To365: Number(row.units181To365 ?? 0), unitsOver365: Number(row.unitsOver365 ?? 0),
      aged90Units: Number(row.units90To180 ?? 0) + Number(row.units181To365 ?? 0) + Number(row.unitsOver365 ?? 0),
      aged180Units: Number(row.units181To365 ?? 0) + Number(row.unitsOver365 ?? 0), aged365Units: Number(row.unitsOver365 ?? 0),
      value0To90: Number(row.value0To90 ?? 0), value90To180: Number(row.value90To180 ?? 0),
      value181To365: Number(row.value181To365 ?? 0), valueOver365: Number(row.valueOver365 ?? 0),
      aged90Value: Number(row.value90To180 ?? 0) + Number(row.value181To365 ?? 0) + Number(row.valueOver365 ?? 0),
      aged180Value: Number(row.value181To365 ?? 0) + Number(row.valueOver365 ?? 0), aged365Value: Number(row.valueOver365 ?? 0),
      skus: String(row.skus ?? ''), categoryIds: Array.isArray(row.categoryIds) ? row.categoryIds.map(Number) : [],
    };
  }

  private filterAnalyticsRows<T extends ReturnType<InventoryMovementService['normalizeAnalyticsRow']>>(rows: T[], query: Record<string, string | undefined>) {
    const search = query.search?.trim().toLocaleLowerCase('es') ?? '';
    return rows.filter((row) => {
      if (row.available <= 0) return false;
      if (query.productId && row.productId !== Number(query.productId)) return false;
      if (search && !`${row.title} ${row.brand ?? ''} ${row.skus}`.toLocaleLowerCase('es').includes(search)) return false;
      if (query.policy && row.inventoryPolicy !== query.policy) return false;
      if (query.categoryId && !row.categoryIds.includes(Number(query.categoryId))) return false;
      if (query.brand && row.brand !== query.brand) return false;
      if (query.alert === 'without-stock' && !(row.published && row.inventoryPolicy === 'RESTOCK' && row.available <= 0)) return false;
      if (query.alert === 'low-stock' && !(row.published && row.inventoryPolicy === 'RESTOCK' && row.available > 0 && row.available <= row.lowStockThreshold)) return false;
      if (query.quickFilter === 'older-90' && row.aged90Units <= 0) return false;
      if (query.quickFilter === 'older-180' && row.aged180Units <= 0) return false;
      if (query.quickFilter === 'older-365' && row.aged365Units <= 0) return false;
      if (query.quickFilter === 'no-sales-90' && !(row.available > 0 && (!row.lastSaleAt || row.noSaleDays! >= 90))) return false;
      if (query.noSaleDays) {
        if (row.onHand <= 0) return false;
        if (row.lastSaleAt && row.noSaleDays! < Number(query.noSaleDays)) return false;
      }
      if (query.agingBucket === '0-90' && !(row.ageDays !== null && row.ageDays < 90)) return false;
      if (['90-180', '91-180'].includes(query.agingBucket ?? '') && !(row.ageDays !== null && row.ageDays >= 90 && row.ageDays < 180)) return false;
      if (query.agingBucket === '181-365' && !(row.ageDays !== null && row.ageDays >= 180 && row.ageDays < 365)) return false;
      if (query.agingBucket === '365+' && !(row.ageDays !== null && row.ageDays >= 365)) return false;
      return true;
    });
  }

  private sortAnalyticsRows<T extends ReturnType<InventoryMovementService['normalizeAnalyticsRow']>>(rows: T[], sortBy = 'ageDays', direction = 'desc') {
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const key = ['title','onHand','available','retailValue','sold90','ageDays','noSaleDays','sellThrough','lastSaleAt','immobilizedValue'].includes(sortBy) ? sortBy : 'ageDays';
      const a = left[key as keyof T] ?? (multiplier === 1 ? Number.MAX_SAFE_INTEGER : -1);
      const b = right[key as keyof T] ?? (multiplier === 1 ? Number.MAX_SAFE_INTEGER : -1);
      return (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es')) * multiplier;
    });
  }

  private immobilizedValue(row: ReturnType<InventoryMovementService['normalizeAnalyticsRow']>, query: Record<string, string | undefined>) {
    if (query.quickFilter === 'older-90') return row.aged90Value;
    if (query.quickFilter === 'older-365' || query.agingBucket === '365+') return row.aged365Value;
    if (query.quickFilter === 'no-sales-90') return row.retailValue;
    if (query.agingBucket === '0-90') return row.value0To90;
    if (['90-180', '91-180'].includes(query.agingBucket ?? '')) return row.value90To180;
    if (query.agingBucket === '181-365') return row.value181To365;
    return row.aged180Value;
  }

  private positiveInt(value: string | undefined, fallback: number, max: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
  }

  private toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
