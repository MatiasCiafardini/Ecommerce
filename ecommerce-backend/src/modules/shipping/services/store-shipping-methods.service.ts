import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomUUID } from 'crypto';

type RawStoreShippingMethodRow = {
  id: string;
  storeId: number;
  name: string;
  type: string;
  price: Prisma.Decimal | number | string;
  freeShippingMinimumAmount: Prisma.Decimal | number | string | null;
  estimatedDays: number | null;
  description: string | null;
  active: boolean;
  displayOrder: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoreShippingMethodRecord = {
  id: string;
  storeId: number;
  name: string;
  type: 'pickup' | 'manual' | 'free' | 'coordinar' | 'integration';
  price: number;
  freeShippingMinimumAmount: number | null;
  estimatedDays: number | null;
  description: string | null;
  active: boolean;
  displayOrder: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class StoreShippingMethodsService {
  constructor(private prisma: PrismaService) {}

  async findAll(storeId: number, includeArchived = false) {
    const rows = includeArchived
      ? await this.prisma.$queryRaw<RawStoreShippingMethodRow[]>`
          SELECT *
          FROM "StoreShippingMethod"
          WHERE "storeId" = ${storeId}
          ORDER BY "displayOrder" ASC, "createdAt" ASC
        `
      : await this.prisma.$queryRaw<RawStoreShippingMethodRow[]>`
          SELECT *
          FROM "StoreShippingMethod"
          WHERE "storeId" = ${storeId}
            AND "deletedAt" IS NULL
          ORDER BY "displayOrder" ASC, "createdAt" ASC
        `;

    return rows.map((row) => this.mapRow(row));
  }

  async findActive(storeId: number) {
    const rows = await this.prisma.$queryRaw<RawStoreShippingMethodRow[]>`
      SELECT *
      FROM "StoreShippingMethod"
      WHERE "storeId" = ${storeId}
        AND "active" = true
        AND "deletedAt" IS NULL
      ORDER BY "displayOrder" ASC, "createdAt" ASC
    `;

    return rows.map((row) => this.mapRow(row));
  }

  async hasAnyConfigured(storeId: number) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
      SELECT COUNT(*)::int AS count
      FROM "StoreShippingMethod"
      WHERE "storeId" = ${storeId}
        AND "deletedAt" IS NULL
    `;

    return Number(rows[0]?.count ?? 0) > 0;
  }

  async findOne(storeId: number, id: string) {
    const rows = await this.prisma.$queryRaw<RawStoreShippingMethodRow[]>`
      SELECT *
      FROM "StoreShippingMethod"
      WHERE "storeId" = ${storeId}
        AND "id" = ${id}
      LIMIT 1
    `;

    const row = rows[0];

    if (!row || row.deletedAt) {
      throw new NotFoundException('Store shipping method not found');
    }

    return this.mapRow(row);
  }

  async create(
    storeId: number,
    data: {
      name: string;
      type: string;
      price: number;
      freeShippingMinimumAmount?: number | null;
      estimatedDays?: number | null;
      description?: string;
      active?: boolean;
      displayOrder?: number;
    },
  ) {
    const normalized = this.normalizePayload(data);
    const id = randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO "StoreShippingMethod" (
        "id",
        "storeId",
        "name",
        "type",
        "price",
        "freeShippingMinimumAmount",
        "estimatedDays",
        "description",
        "active",
        "displayOrder",
        "updatedAt"
      ) VALUES (
        ${id},
        ${storeId},
        ${normalized.name},
        ${normalized.type},
        ${normalized.price},
        ${normalized.freeShippingMinimumAmount},
        ${normalized.estimatedDays},
        ${normalized.description},
        ${normalized.active},
        ${normalized.displayOrder},
        NOW()
      )
    `;

    return this.findOne(storeId, id);
  }

  async update(
    storeId: number,
    id: string,
    data: {
      name?: string;
      type?: string;
      price?: number;
      freeShippingMinimumAmount?: number | null;
      estimatedDays?: number | null;
      description?: string;
      active?: boolean;
      displayOrder?: number;
    },
  ) {
    const current = await this.findOne(storeId, id);
    const normalized = this.normalizePayload({
      name: data.name ?? current.name,
      type: data.type ?? current.type,
      price: data.price ?? current.price,
      freeShippingMinimumAmount:
        data.freeShippingMinimumAmount === undefined
          ? current.freeShippingMinimumAmount
          : data.freeShippingMinimumAmount,
      estimatedDays:
        data.estimatedDays === undefined
          ? current.estimatedDays
          : data.estimatedDays,
      description:
        data.description === undefined ? current.description || undefined : data.description,
      active: data.active ?? current.active,
      displayOrder: data.displayOrder ?? current.displayOrder,
    });

    await this.prisma.$executeRaw`
      UPDATE "StoreShippingMethod"
      SET
        "name" = ${normalized.name},
        "type" = ${normalized.type},
        "price" = ${normalized.price},
        "freeShippingMinimumAmount" = ${normalized.freeShippingMinimumAmount},
        "estimatedDays" = ${normalized.estimatedDays},
        "description" = ${normalized.description},
        "active" = ${normalized.active},
        "displayOrder" = ${normalized.displayOrder},
        "updatedAt" = NOW()
      WHERE "storeId" = ${storeId}
        AND "id" = ${id}
        AND "deletedAt" IS NULL
    `;

    return this.findOne(storeId, id);
  }

  async setActive(storeId: number, id: string, active: boolean) {
    await this.findOne(storeId, id);

    await this.prisma.$executeRaw`
      UPDATE "StoreShippingMethod"
      SET
        "active" = ${active},
        "updatedAt" = NOW()
      WHERE "storeId" = ${storeId}
        AND "id" = ${id}
        AND "deletedAt" IS NULL
    `;

    return this.findOne(storeId, id);
  }

  async reorder(
    storeId: number,
    items: Array<{ id: string; displayOrder: number }>,
  ) {
    if (!items.length) {
      return this.findAll(storeId);
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.$executeRaw`
          UPDATE "StoreShippingMethod"
          SET
            "displayOrder" = ${item.displayOrder},
            "updatedAt" = NOW()
          WHERE "storeId" = ${storeId}
            AND "id" = ${item.id}
            AND "deletedAt" IS NULL
        `,
      ),
    );

    return this.findAll(storeId);
  }

  async archive(storeId: number, id: string) {
    await this.findOne(storeId, id);

    await this.prisma.$executeRaw`
      UPDATE "StoreShippingMethod"
      SET
        "active" = false,
        "deletedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "storeId" = ${storeId}
        AND "id" = ${id}
        AND "deletedAt" IS NULL
    `;

    return { archived: true, id };
  }

  async findActiveByName(storeId: number, name?: string | null) {
    const normalizedName = name?.trim();

    if (!normalizedName) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<RawStoreShippingMethodRow[]>`
      SELECT *
      FROM "StoreShippingMethod"
      WHERE "storeId" = ${storeId}
        AND "active" = true
        AND "deletedAt" IS NULL
        AND LOWER("name") = LOWER(${normalizedName})
      ORDER BY "displayOrder" ASC, "createdAt" ASC
      LIMIT 1
    `;

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private normalizePayload(data: {
    name: string;
    type: string;
    price: number;
    freeShippingMinimumAmount?: number | null;
    estimatedDays?: number | null;
    description?: string;
    active?: boolean;
    displayOrder?: number;
  }) {
    const name = data.name?.trim();

    if (!name) {
      throw new BadRequestException('Shipping method name is required');
    }

    const type = this.normalizeType(data.type);
    const forceZeroPrice =
      type === 'pickup' ||
      type === 'free' ||
      type === 'coordinar' ||
      type === 'integration';
    const price = forceZeroPrice ? 0 : Math.max(Number(data.price ?? 0), 0);
    const rawFreeShippingMinimumAmount = Number(
      data.freeShippingMinimumAmount ?? 0,
    );
    const freeShippingMinimumAmount =
      type === 'free' && rawFreeShippingMinimumAmount > 0
        ? rawFreeShippingMinimumAmount
        : null;
    const rawEstimatedDays =
      data.estimatedDays === null || data.estimatedDays === undefined
        ? null
        : Number(data.estimatedDays);
    const estimatedDays =
      rawEstimatedDays !== null && Number.isFinite(rawEstimatedDays)
        ? Math.max(Math.trunc(rawEstimatedDays), 0)
        : null;

    return {
      name,
      type,
      price,
      freeShippingMinimumAmount,
      estimatedDays,
      description: data.description?.trim() || null,
      active: data.active ?? true,
      displayOrder: Math.max(Number(data.displayOrder ?? 0), 0),
    };
  }

  private normalizeType(type: string) {
    const normalized = type?.trim().toLowerCase();

    if (
      normalized !== 'pickup' &&
      normalized !== 'manual' &&
      normalized !== 'free' &&
      normalized !== 'coordinar' &&
      normalized !== 'integration'
    ) {
      throw new BadRequestException('Invalid store shipping method type');
    }

    return normalized as StoreShippingMethodRecord['type'];
  }

  private mapRow(row: RawStoreShippingMethodRow): StoreShippingMethodRecord {
    return {
      id: row.id,
      storeId: Number(row.storeId),
      name: row.name,
      type: this.normalizeType(row.type),
      price: Number(row.price ?? 0),
      freeShippingMinimumAmount:
        row.freeShippingMinimumAmount === null ||
        row.freeShippingMinimumAmount === undefined
          ? null
          : Number(row.freeShippingMinimumAmount),
      estimatedDays:
        row.estimatedDays === null || row.estimatedDays === undefined
          ? null
          : Number(row.estimatedDays),
      description: row.description ?? null,
      active: Boolean(row.active),
      displayOrder: Number(row.displayOrder ?? 0),
      deletedAt: row.deletedAt ?? null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
