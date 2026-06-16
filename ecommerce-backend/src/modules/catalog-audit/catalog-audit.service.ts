import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CatalogAuditActor = {
  sub?: number | string;
  email?: string;
  name?: string;
};

type CatalogAuditTarget = {
  productId?: number | null;
  variantId?: number | null;
  entity: string;
  entityId?: number | null;
};

type CatalogAuditInput = CatalogAuditTarget & {
  storeId: number;
  action: string;
  actor?: CatalogAuditActor | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

@Injectable()
export class CatalogAuditService {
  constructor(private prisma: PrismaService) {}

  create(input: CatalogAuditInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const actorUserId = Number(input.actor?.sub);

    return client.catalogAuditLog.create({
      data: {
        storeId: input.storeId,
        productId: input.productId ?? null,
        variantId: input.variantId ?? null,
        actorUserId: Number.isInteger(actorUserId) && actorUserId > 0 ? actorUserId : null,
        actorEmail: input.actor?.email ?? null,
        actorName: input.actor?.name ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: this.toJson(input.before),
        after: this.toJson(input.after),
        metadata: this.toJson(input.metadata),
      },
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
