import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { ShippingRate } from '../providers/shipping-provider.interface';

@Injectable()
export class ShippingQuotesService {
  constructor(private prisma: PrismaService) {}

  async persistQuotes(params: {
    storeId: number;
    cartId: number;
    customerId: number;
    postalCode: string;
    state?: string;
    city?: string;
    country?: string;
    weight: number;
    value: number;
    providerConfigId?: string | null;
    rates: ShippingRate[];
  }) {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const created = await Promise.all(
      params.rates.map((rate) =>
        this.prisma.shippingQuote.create({
          data: {
            storeId: params.storeId,
            cartId: params.cartId,
            customerId: params.customerId,
            provider: rate.provider,
            method: rate.method,
            price: rate.price,
            estimatedDays: rate.estimatedDays,
            postalCode: params.postalCode,
            state: params.state ?? null,
            city: params.city ?? null,
            country: params.country ?? null,
            weight: params.weight,
            declaredValue: params.value,
            carrierId: rate.carrierId ?? null,
            carrierName: rate.carrierName ?? null,
            serviceCode: rate.serviceCode ?? null,
            modalityCode: rate.modalityCode ?? null,
            dispatchType: rate.dispatchType ?? null,
            branchId: rate.branchId ?? null,
            sellerCost: rate.sellerCost ?? null,
            providerConfigId:
              rate.providerConfigId ?? params.providerConfigId ?? null,
            metadata:
              (rate.metadata as Prisma.InputJsonValue | undefined) ??
              ({
                description: rate.description ?? null,
                storeShippingMethodId: rate.storeShippingMethodId ?? null,
                methodType: rate.methodType ?? null,
              } as Prisma.InputJsonObject),
            expiresAt,
          },
          select: {
            id: true,
          },
        }),
      ),
    );

    return params.rates.map((rate, index) => ({
      ...rate,
      quoteId: created[index].id,
    }));
  }

  async findUsableQuoteById(params: {
    storeId: number;
    cartId: number;
    customerId: number;
    quoteId: string;
  }) {
    return this.prisma.shippingQuote.findFirst({
      where: {
        id: params.quoteId,
        storeId: params.storeId,
        cartId: params.cartId,
        customerId: params.customerId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async findMatchingQuote(params: {
    storeId: number;
    cartId: number;
    customerId: number;
    provider?: string | null;
    method?: string | null;
    postalCode?: string | null;
    carrierId?: string | null;
    carrierName?: string | null;
    serviceCode?: string | null;
    modalityCode?: string | null;
    dispatchType?: string | null;
    branchId?: string | null;
  }) {
    return this.prisma.shippingQuote.findFirst({
      where: {
        storeId: params.storeId,
        cartId: params.cartId,
        customerId: params.customerId,
        provider: params.provider ?? undefined,
        method: params.method ?? undefined,
        postalCode: params.postalCode ?? undefined,
        carrierId: params.carrierId ?? undefined,
        carrierName: params.carrierName ?? undefined,
        serviceCode: params.serviceCode ?? undefined,
        modalityCode: params.modalityCode ?? undefined,
        dispatchType: params.dispatchType ?? undefined,
        branchId: params.branchId ?? undefined,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
