import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { DiscountsService } from '../discounts/discounts.service';
import { ProductPricingService } from '../discounts/product-pricing.service';
import { ShippingQuotesService } from '../shipping/services/shipping-quotes.service';
import { StoreShippingMethodsService } from '../shipping/services/store-shipping-methods.service';
import { roundCurrency } from '../../common/currency';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private inventoryLockService: InventoryLockService,
    private discountsService: DiscountsService,
    private productPricingService: ProductPricingService,
    private shippingQuotesService: ShippingQuotesService,
    private storeShippingMethodsService: StoreShippingMethodsService,
  ) {}

  async checkout(
    storeId: number,
    cartId: number,
    dto: CheckoutDto,
    customerId: number,
  ) {
    const {
      shippingProvider,
      shippingMethod,
      shippingQuoteId,
      shippingCost,
      couponCode,
      paymentMethod,
      idempotencyKey,
      shippingAddress,
      shippingSelection,
    } = dto;

    if (idempotencyKey) {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          storeId,
          idempotencyKey,
        },
      });

      if (existingOrder) {
        return existingOrder;
      }
    }

    const customer = await this.ensureCustomer(storeId, customerId);

    const cart = await this.prisma.cart.findUnique({
      where: {
        id: cartId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                inventories: {
                  where: {
                    storeId,
                  },
                },
                product: {
                  include: {
                    categories: {
                      include: {
                        category: true,
                      },
                    },
                    optionValues: {
                      select: {
                        productOptionId: true,
                        value: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.storeId !== storeId) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.customerId !== customerId) {
      throw new ForbiddenException('Cart does not belong to this customer');
    }

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const checkoutPhone = shippingAddress.phone?.trim() || customer.phone?.trim();

    if (!checkoutPhone) {
      throw new BadRequestException('Phone is required for checkout');
    }

    const {
      baseSubtotal: subtotal,
      itemScopedDiscountAmount,
      discountedSubtotal,
      itemBreakdown,
    } = await this.productPricingService.resolveCartItemDiscounts(
      storeId,
      cart.items,
    );

    const discountByVariantId = new Map(
      itemBreakdown.map((b) => [b.variantId, b.itemScopedDiscountPerUnit]),
    );

    for (const item of cart.items) {
      const inventory = item.variant.inventories[0];
      const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);

      if (item.quantity > available) {
        throw new BadRequestException(
          `Not enough stock for ${item.variant.product.title}`,
        );
      }
    }

    let discountAmount = roundCurrency(itemScopedDiscountAmount);
    let discountId: number | null = null;
    let discountCode: string | null = null;
    let freeShipping = false;

    const resolvedDiscount = await this.discountsService.previewDiscount(storeId, {
      subtotal: discountedSubtotal,
      code: couponCode,
      paymentMethod,
    });

    if (resolvedDiscount) {
      discountAmount = roundCurrency(discountAmount + resolvedDiscount.amount);
      discountId = resolvedDiscount.discountId ?? null;
      discountCode = resolvedDiscount.code ?? null;
      freeShipping = resolvedDiscount.freeShipping;
    }

    let finalShippingCost = roundCurrency(shippingCost ?? 0);

    if (freeShipping) {
      finalShippingCost = 0;
    }

    const validatedShipping = await this.resolveValidatedShippingSelection({
      storeId,
      cartId,
      customerId,
      shippingQuoteId,
      shippingProvider,
      shippingMethod,
      shippingCost: finalShippingCost,
      shippingAddress,
      shippingSelection,
      freeShipping,
      subtotal: discountedSubtotal,
    });

    if (validatedShipping) {
      finalShippingCost = roundCurrency(validatedShipping.shippingCost);
    }

    this.validatePaymentMethod({
      paymentMethod,
      shippingProvider:
        validatedShipping?.shippingProvider ?? shippingProvider ?? null,
      shippingMethod:
        validatedShipping?.shippingMethod ?? shippingMethod ?? null,
    });

    const total = roundCurrency(subtotal - discountAmount + finalShippingCost);
    const cashPayment = this.isCashPaymentMethod(paymentMethod);

    return this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        await this.inventoryLockService.reserveStockTx(
          tx,
          storeId,
          item.variantId,
          item.quantity,
        );
      }

      const order = await tx.order.create({
        data: {
          storeId,
          customerId,
          subtotal,
          discountAmount,
          discountCode,
          discountId,
          total,
          status: 'pending',
          shippingProvider:
            validatedShipping?.shippingProvider ?? shippingProvider,
          shippingMethod: validatedShipping?.shippingMethod ?? shippingMethod,
          shippingCost: finalShippingCost,
          shippingCarrierId:
            validatedShipping?.shippingSelection?.carrierId ??
            shippingSelection?.carrierId ??
            null,
          shippingCarrierName:
            validatedShipping?.shippingSelection?.carrierName ??
            shippingSelection?.carrierName ??
            null,
          shippingServiceCode:
            validatedShipping?.shippingSelection?.serviceCode ??
            shippingSelection?.serviceCode ??
            null,
          shippingModalityCode:
            validatedShipping?.shippingSelection?.modalityCode ??
            shippingSelection?.modalityCode ??
            null,
          shippingDispatchType:
            validatedShipping?.shippingSelection?.dispatchType ??
            shippingSelection?.dispatchType ??
            null,
          shippingBranchId:
            validatedShipping?.shippingSelection?.branchId ??
            shippingSelection?.branchId ??
            null,
          shippingProviderConfigId:
            validatedShipping?.shippingProviderConfigId ?? null,
          shippingQuoteId: validatedShipping?.shippingQuoteId ?? null,
          customerEmailSnapshot: customer.email,
          customerFirstNameSnapshot: customer.firstName ?? null,
          customerLastNameSnapshot: customer.lastName ?? null,
          customerPhoneSnapshot: checkoutPhone,
          shippingFirstNameSnapshot: shippingAddress.firstName,
          shippingLastNameSnapshot: shippingAddress.lastName,
          shippingPhoneSnapshot: checkoutPhone,
          shippingAddress1Snapshot: shippingAddress.address1,
          shippingAddress2Snapshot: shippingAddress.address2 ?? null,
          shippingCitySnapshot: shippingAddress.city,
          shippingStateSnapshot: shippingAddress.state ?? null,
          shippingPostalCodeSnapshot: shippingAddress.zip,
          shippingCountrySnapshot: shippingAddress.country,
          idempotencyKey: idempotencyKey ?? null,
        } as any,
      });

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            quantity: item.quantity,
            price: Number(item.variant.price),
            discountAmount: discountByVariantId.get(item.variantId) ?? 0,
          },
        });
      }

      if (cashPayment) {
        await tx.payment.create({
          data: {
            storeId,
            orderId: order.id,
            provider: 'cash',
            method: 'cash',
            status: 'pending',
            amount: total,
            idempotencyKey: idempotencyKey
              ? `cash-checkout:${idempotencyKey}`
              : `cash-checkout:order-${order.id}`,
            metadata: {
              source: 'checkout',
              channel: 'cash_on_pickup',
            },
          },
        });
      }

      if (resolvedDiscount?.source === 'coupon' && resolvedDiscount.couponId) {
        await tx.coupon.update({
          where: {
            id: resolvedDiscount.couponId,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      if (validatedShipping?.shippingQuoteId) {
        await tx.shippingQuote.update({
          where: {
            id: validatedShipping.shippingQuoteId,
          },
          data: {
            consumedAt: new Date(),
          },
        });
      }

      if (!customer.phone?.trim() && shippingAddress.phone?.trim()) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            phone: checkoutPhone,
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId,
        },
      });

      return order;
    });
  }

  private async ensureCustomer(storeId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        storeId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!customer) {
      throw new ForbiddenException('Customer does not belong to this store');
    }

    return customer;
  }

  private async resolveValidatedShippingSelection(params: {
    storeId: number;
    cartId: number;
    customerId: number;
    shippingQuoteId?: string;
    shippingProvider?: string;
    shippingMethod?: string;
    shippingCost: number;
    shippingAddress: { zip: string };
    shippingSelection?: {
      carrierId?: string;
      carrierName?: string;
      serviceCode?: string;
      modalityCode?: string;
      dispatchType?: string;
      branchId?: string;
    };
    freeShipping: boolean;
    subtotal: number;
  }) {
    const normalizedProvider = params.shippingProvider?.trim().toLowerCase();
    const normalizedMethod = params.shippingMethod?.trim();

    if (!normalizedProvider && !normalizedMethod) {
      return null;
    }

    let quote = params.shippingQuoteId
      ? await this.shippingQuotesService.findUsableQuoteById({
          storeId: params.storeId,
          cartId: params.cartId,
          customerId: params.customerId,
          quoteId: params.shippingQuoteId,
        })
      : null;

    if (!quote) {
      quote = await this.shippingQuotesService.findMatchingQuote({
        storeId: params.storeId,
        cartId: params.cartId,
        customerId: params.customerId,
        provider: normalizedProvider ?? null,
        method: normalizedMethod ?? null,
        postalCode: params.shippingAddress.zip,
        carrierId: params.shippingSelection?.carrierId ?? null,
        carrierName: params.shippingSelection?.carrierName ?? null,
        serviceCode: params.shippingSelection?.serviceCode ?? null,
        modalityCode: params.shippingSelection?.modalityCode ?? null,
        dispatchType: params.shippingSelection?.dispatchType ?? null,
        branchId: params.shippingSelection?.branchId ?? null,
      });
    }

    if (!quote) {
      return this.resolveManualShippingWithoutQuote(params);
    }

    if (normalizedProvider && quote.provider !== normalizedProvider) {
      throw new BadRequestException(
        'Shipping provider does not match the selected server quote',
      );
    }

    if (normalizedMethod && quote.method !== normalizedMethod) {
      throw new BadRequestException(
        'Shipping method does not match the selected server quote',
      );
    }

    const expectedPrice = params.freeShipping ? 0 : Number(quote.price);

    if (
      !params.freeShipping &&
      Math.abs(expectedPrice - Number(params.shippingCost ?? 0)) > 0.01
    ) {
      throw new BadRequestException(
        'Shipping cost does not match the latest server quote',
      );
    }

    return {
      shippingProvider: quote.provider,
      shippingMethod: quote.method,
      shippingCost: expectedPrice,
      shippingSelection: {
        carrierId: quote.carrierId ?? undefined,
        carrierName: quote.carrierName ?? undefined,
        serviceCode: quote.serviceCode ?? undefined,
        modalityCode: quote.modalityCode ?? undefined,
        dispatchType: quote.dispatchType ?? undefined,
        branchId: quote.branchId ?? undefined,
      },
      shippingProviderConfigId: quote.providerConfigId ?? null,
      shippingQuoteId: quote.id,
    };
  }

  private async resolveManualShippingWithoutQuote(params: {
    storeId: number;
    shippingProvider?: string;
    shippingMethod?: string;
    shippingCost: number;
    subtotal: number;
  }) {
    const provider = params.shippingProvider?.trim().toLowerCase();
    const method = params.shippingMethod?.trim() || '';
    const normalizedMethod = method.toLowerCase();
    const isManualProvider =
      !provider ||
      provider === 'manual' ||
      provider === 'store' ||
      provider === 'pickup';
    const isManualMethod =
      normalizedMethod.includes('retiro') ||
      normalizedMethod.includes('pickup') ||
      normalizedMethod.includes('coordinar') ||
      normalizedMethod.includes('gratis') ||
      normalizedMethod.includes('fijo') ||
      normalizedMethod.includes('manual');

    if (!isManualProvider && !isManualMethod) {
      return null;
    }

    const configuredMethod =
      await this.storeShippingMethodsService.findActiveByName(
        params.storeId,
        method,
      );

    if (configuredMethod) {
      const freeShippingMinimumAmount = Number(
        configuredMethod.freeShippingMinimumAmount ?? 0,
      );

      if (
        configuredMethod.type === 'free' &&
        freeShippingMinimumAmount > 0 &&
        params.subtotal < freeShippingMinimumAmount
      ) {
        throw new BadRequestException(
          'Cart subtotal does not meet the free shipping minimum amount',
        );
      }

      return {
        shippingProvider: configuredMethod.type === 'pickup' ? 'store' : 'manual',
        shippingMethod: configuredMethod.name,
        shippingCost: Number(configuredMethod.price),
        shippingSelection: {
          carrierId: configuredMethod.type === 'pickup' ? 'store' : 'manual',
          carrierName: configuredMethod.name,
          serviceCode: configuredMethod.type,
          modalityCode:
            configuredMethod.type === 'pickup' ? 'pickup' : 'manual',
          dispatchType: configuredMethod.type,
          branchId: undefined,
        },
        shippingProviderConfigId: null,
        shippingQuoteId: null,
      };
    }

    const carrierName = normalizedMethod.includes('retiro')
      ? 'Retiro en local'
      : normalizedMethod.includes('coordinar')
        ? 'Envio a coordinar'
        : 'Envio manual';
    const shippingCost =
      normalizedMethod.includes('retiro') ||
      normalizedMethod.includes('coordinar') ||
      normalizedMethod.includes('gratis')
        ? 0
        : Number(params.shippingCost ?? 0);

    return {
      shippingProvider:
        provider === 'store' || normalizedMethod.includes('retiro')
          ? 'store'
          : 'manual',
      shippingMethod: method || 'Envio manual',
      shippingCost,
      shippingSelection: {
        carrierId:
          provider === 'store' || normalizedMethod.includes('retiro')
            ? 'store'
            : 'manual',
        carrierName,
        serviceCode: undefined,
        modalityCode: undefined,
        dispatchType: undefined,
        branchId: undefined,
      },
      shippingProviderConfigId: null,
      shippingQuoteId: null,
    };
  }

  private validatePaymentMethod(params: {
    paymentMethod?: string | null;
    shippingProvider?: string | null;
    shippingMethod?: string | null;
  }) {
    const paymentMethod = params.paymentMethod?.trim().toLowerCase() ?? '';

    if (!paymentMethod) {
      throw new BadRequestException('Payment method is required for checkout');
    }

    const pickupOrder = this.isPickupOrder({
      shippingProvider: params.shippingProvider,
      shippingMethod: params.shippingMethod,
    });

    if (this.isCashPaymentMethod(paymentMethod)) {
      if (!pickupOrder) {
        throw new BadRequestException(
          'Cash payments are only available for pickup orders',
        );
      }

      return;
    }

    if (
      paymentMethod !== 'mercadopago' &&
      paymentMethod !== 'bank_transfer'
    ) {
      throw new BadRequestException('Unsupported payment method for checkout');
    }
  }

  private isCashPaymentMethod(paymentMethod?: string | null) {
    const normalized = paymentMethod?.trim().toLowerCase() ?? '';

    return (
      normalized === 'cash' ||
      normalized === 'cash_on_pickup' ||
      normalized === 'efectivo'
    );
  }

  private isPickupOrder(order: {
    shippingProvider?: string | null;
    shippingMethod?: string | null;
  }) {
    const shippingProvider = order.shippingProvider?.trim().toLowerCase() ?? '';
    const shippingMethod = order.shippingMethod?.trim().toLowerCase() ?? '';

    return (
      shippingProvider === 'store' ||
      shippingMethod.includes('retiro') ||
      shippingMethod.includes('pickup')
    );
  }
}
