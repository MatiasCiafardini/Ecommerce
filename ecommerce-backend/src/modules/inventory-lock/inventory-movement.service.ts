import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      WITH sales AS (
        SELECT oi."variantId",
          MAX(o."createdAt") AS "lastSaleAt",
          COALESCE(SUM(oi.quantity - oi."returnedQuantity") FILTER (WHERE o."createdAt" >= NOW() - INTERVAL '30 days'), 0)::int AS "sold30",
          COALESCE(SUM(oi.quantity - oi."returnedQuantity") FILTER (WHERE o."createdAt" >= NOW() - INTERVAL '60 days'), 0)::int AS "sold60",
          COALESCE(SUM(oi.quantity - oi."returnedQuantity") FILTER (WHERE o."createdAt" >= NOW() - INTERVAL '90 days'), 0)::int AS "sold90"
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        WHERE o."storeId" = ${storeId}
          AND o.status::text IN ('paid','processing','packed','ready_for_pickup','picked_up','shipped','delivered')
          AND o."deletedAt" IS NULL
        GROUP BY oi."variantId"
      ), movement_totals AS (
        SELECT "variantId",
          COALESCE(SUM(-"quantityDelta") FILTER (WHERE "quantityDelta" < 0), 0)::int AS consumed,
          MAX("createdAt") FILTER (WHERE "quantityDelta" <> 0) AS "lastStockChangeAt",
          MAX("createdAt") FILTER (WHERE "quantityDelta" > 0 AND type IN ('OPENING_BALANCE','INITIAL_LOAD','MANUAL_ADJUSTMENT')) AS "lastLoadAt"
        FROM "InventoryMovement"
        WHERE "storeId" = ${storeId}
        GROUP BY "variantId"
      ), inbound_layers AS (
        SELECT m."variantId", m."createdAt", m.approximate,
          SUM(m."quantityDelta") OVER (PARTITION BY m."variantId" ORDER BY m."createdAt", m.id) AS cumulative_inbound
        FROM "InventoryMovement" m
        WHERE m."storeId" = ${storeId} AND m."quantityDelta" > 0
      ), remaining_age AS (
        SELECT l."variantId",
          MIN(l."createdAt") FILTER (WHERE l.cumulative_inbound > COALESCE(t.consumed, 0)) AS "oldestStockAt",
          BOOL_OR(l.approximate) FILTER (WHERE l.cumulative_inbound > COALESCE(t.consumed, 0)) AS "ageApproximate"
        FROM inbound_layers l
        LEFT JOIN movement_totals t ON t."variantId" = l."variantId"
        GROUP BY l."variantId"
      )
      SELECT p.id AS "productId", p.title, p.brand, p.published,
        p."inventoryPolicy"::text AS "inventoryPolicy", p."lowStockThreshold",
        COALESCE(SUM(i.quantity), 0)::int AS "onHand",
        COALESCE(SUM(i.reserved), 0)::int AS reserved,
        COALESCE(SUM(i.quantity - i.reserved), 0)::int AS available,
        COALESCE(SUM(i.quantity * v.price), 0)::numeric AS "retailValue",
        COALESCE(SUM(s."sold30"), 0)::int AS "sold30",
        COALESCE(SUM(s."sold60"), 0)::int AS "sold60",
        COALESCE(SUM(s."sold90"), 0)::int AS "sold90",
        MAX(s."lastSaleAt") AS "lastSaleAt",
        MAX(t."lastStockChangeAt") AS "lastStockChangeAt",
        MAX(t."lastLoadAt") AS "lastLoadAt",
        MIN(a."oldestStockAt") FILTER (WHERE i.quantity > 0) AS "oldestStockAt",
        BOOL_OR(COALESCE(a."ageApproximate", false)) FILTER (WHERE i.quantity > 0) AS "ageApproximate",
        STRING_AGG(v.sku, ' ') AS skus,
        ARRAY(SELECT pc."categoryId" FROM "ProductCategory" pc WHERE pc."productId" = p.id) AS "categoryIds"
      FROM "Product" p
      LEFT JOIN "ProductVariant" v ON v."productId" = p.id AND v."deletedAt" IS NULL
      LEFT JOIN "Inventory" i ON i."variantId" = v.id AND i."storeId" = p."storeId"
      LEFT JOIN sales s ON s."variantId" = v.id
      LEFT JOIN movement_totals t ON t."variantId" = v.id
      LEFT JOIN remaining_age a ON a."variantId" = v.id
      WHERE p."storeId" = ${storeId} AND p."deletedAt" IS NULL
      GROUP BY p.id
    `);

    const normalized = rows.map((row) => this.normalizeAnalyticsRow(row));
    const filtered = this.filterAnalyticsRows(normalized, query);
    const sorted = this.sortAnalyticsRows(filtered, query.sortBy, query.sortDirection);
    const page = this.positiveInt(query.page, 1, 10_000);
    const pageSize = query.exportAll === 'true' ? Math.max(1, sorted.length) : this.positiveInt(query.pageSize, 40, 120);
    const included = normalized.filter((row) => row.inventoryPolicy !== 'UNTRACKED');
    const active = included.filter((row) => row.published);
    const actionable = active.filter((row) => row.inventoryPolicy === 'RESTOCK');
    const aged = included.filter((row) => row.onHand > 0 && row.ageDays !== null);
    const fastest = [...active]
      .filter((row) => row.sold90 > 0)
      .sort((left, right) => right.sellThrough - left.sellThrough || right.sold90 - left.sold90)
      .slice(0, 5);
    const slowest = [...active]
      .filter((row) => row.onHand > 0)
      .sort((left, right) => left.sold90 - right.sold90 || (right.ageDays ?? -1) - (left.ageDays ?? -1))
      .slice(0, 5);
    return {
      summary: {
        products: included.length,
        onHand: included.reduce((sum, row) => sum + row.onHand, 0),
        reserved: included.reduce((sum, row) => sum + row.reserved, 0),
        available: included.reduce((sum, row) => sum + row.available, 0),
        retailValue: included.reduce((sum, row) => sum + row.retailValue, 0),
        withoutStock: actionable.filter((row) => row.available <= 0).length,
        lowStock: actionable.filter((row) => row.available > 0 && row.available <= row.lowStockThreshold).length,
        unclassified: normalized.filter((row) => row.inventoryPolicy === 'UNCLASSIFIED').length,
        noSales30: active.filter((row) => row.onHand > 0 && (!row.lastSaleAt || row.noSaleDays! >= 30)).length,
        noSales60: active.filter((row) => row.onHand > 0 && (!row.lastSaleAt || row.noSaleDays! >= 60)).length,
        noSales90: active.filter((row) => row.onHand > 0 && (!row.lastSaleAt || row.noSaleDays! >= 90)).length,
      },
      agingBuckets: [
        { key: '0-90', label: '0 a 90 dias', products: aged.filter((row) => row.ageDays! <= 90).length },
        { key: '91-180', label: '91 a 180 dias', products: aged.filter((row) => row.ageDays! > 90 && row.ageDays! <= 180).length },
        { key: '181-365', label: '181 a 365 dias', products: aged.filter((row) => row.ageDays! > 180 && row.ageDays! <= 365).length },
        { key: '365+', label: 'Mas de 365 dias', products: aged.filter((row) => row.ageDays! > 365).length },
      ],
      rankings: { fastest, slowest },
      items: sorted.slice((page - 1) * pageSize, page * pageSize),
      total: sorted.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    };
  }

  async analyticsCsv(storeId: number, query: Record<string, string | undefined>) {
    const result = await this.analytics(storeId, { ...query, page: '1', exportAll: 'true' });
    const header = ['Producto','Marca','Politica','Stock','Reservado','Disponible','Valor venta','Ultima carga','Ultima venta','Dias sin venta','Antiguedad dias','Ventas 90d','Sell-through'];
    const lines = result.items.map((row) => [row.title,row.brand ?? '',row.inventoryPolicy,row.onHand,row.reserved,row.available,row.retailValue,row.lastLoadAt ?? '',row.lastSaleAt ?? '',row.noSaleDays ?? '',row.ageDays ?? '',row.sold90,row.sellThrough]);
    return [header, ...lines].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  private normalizeAnalyticsRow(row: Record<string, unknown>) {
    const onHand = Number(row.onHand ?? 0);
    const sold90 = Number(row.sold90 ?? 0);
    const lastSaleAt = row.lastSaleAt ? new Date(String(row.lastSaleAt)).toISOString() : null;
    const oldestStockAt = row.oldestStockAt ? new Date(String(row.oldestStockAt)).toISOString() : null;
    const days = (value: string | null) => value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)) : null;
    return {
      productId: Number(row.productId), title: String(row.title), brand: row.brand ? String(row.brand) : null,
      published: Boolean(row.published), inventoryPolicy: String(row.inventoryPolicy), lowStockThreshold: Number(row.lowStockThreshold ?? 3),
      onHand, reserved: Number(row.reserved ?? 0), available: Number(row.available ?? 0), retailValue: Number(row.retailValue ?? 0),
      sold30: Number(row.sold30 ?? 0), sold60: Number(row.sold60 ?? 0), sold90,
      lastSaleAt, lastLoadAt: row.lastLoadAt ? new Date(String(row.lastLoadAt)).toISOString() : null,
      lastStockChangeAt: row.lastStockChangeAt ? new Date(String(row.lastStockChangeAt)).toISOString() : null,
      oldestStockAt, ageApproximate: Boolean(row.ageApproximate), ageDays: days(oldestStockAt), noSaleDays: days(lastSaleAt),
      turnoverPerDay: Number((sold90 / 90).toFixed(2)), sellThrough: sold90 + onHand > 0 ? Number((sold90 * 100 / (sold90 + onHand)).toFixed(1)) : 0,
      skus: String(row.skus ?? ''), categoryIds: Array.isArray(row.categoryIds) ? row.categoryIds.map(Number) : [],
    };
  }

  private filterAnalyticsRows<T extends ReturnType<InventoryMovementService['normalizeAnalyticsRow']>>(rows: T[], query: Record<string, string | undefined>) {
    const search = query.search?.trim().toLocaleLowerCase('es') ?? '';
    return rows.filter((row) => {
      if (query.productId && row.productId !== Number(query.productId)) return false;
      if (search && !`${row.title} ${row.brand ?? ''} ${row.skus}`.toLocaleLowerCase('es').includes(search)) return false;
      if (query.policy && row.inventoryPolicy !== query.policy) return false;
      if (query.categoryId && !row.categoryIds.includes(Number(query.categoryId))) return false;
      if (query.brand && row.brand !== query.brand) return false;
      if (query.alert === 'without-stock' && !(row.published && row.inventoryPolicy === 'RESTOCK' && row.available <= 0)) return false;
      if (query.alert === 'low-stock' && !(row.published && row.inventoryPolicy === 'RESTOCK' && row.available > 0 && row.available <= row.lowStockThreshold)) return false;
      if (query.noSaleDays) {
        if (row.onHand <= 0) return false;
        if (row.lastSaleAt && row.noSaleDays! < Number(query.noSaleDays)) return false;
      }
      if (query.agingBucket === '0-90' && !(row.ageDays !== null && row.ageDays <= 90)) return false;
      if (query.agingBucket === '91-180' && !(row.ageDays !== null && row.ageDays > 90 && row.ageDays <= 180)) return false;
      if (query.agingBucket === '181-365' && !(row.ageDays !== null && row.ageDays > 180 && row.ageDays <= 365)) return false;
      if (query.agingBucket === '365+' && !(row.ageDays !== null && row.ageDays > 365)) return false;
      return true;
    });
  }

  private sortAnalyticsRows<T extends ReturnType<InventoryMovementService['normalizeAnalyticsRow']>>(rows: T[], sortBy = 'ageDays', direction = 'desc') {
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const key = ['title','onHand','available','retailValue','sold90','ageDays','noSaleDays','sellThrough'].includes(sortBy) ? sortBy : 'ageDays';
      const a = left[key as keyof T] ?? (multiplier === 1 ? Number.MAX_SAFE_INTEGER : -1);
      const b = right[key as keyof T] ?? (multiplier === 1 ? Number.MAX_SAFE_INTEGER : -1);
      return (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es')) * multiplier;
    });
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
