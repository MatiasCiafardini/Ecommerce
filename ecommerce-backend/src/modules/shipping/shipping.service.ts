import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import type { ShippingProvider } from './providers/shipping-provider.interface';

@Injectable()
export class ShippingService {
  constructor(
    private prisma: PrismaService,

    @Inject('ShippingProvider')
    private provider: ShippingProvider,
  ) {}

  async getOptions(
    storeId: number,
    cartId: number,
    customerId: number,
    postalCode: string,
  ) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        storeId,
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.customerId !== customerId) {
      throw new ForbiddenException('Cart does not belong to this customer');
    }

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    let weight = 0;
    let value = 0;

    for (const item of cart.items) {
      weight += (item.variant.weight ?? 0) * item.quantity;
      value += Number(item.variant.price) * item.quantity;
    }

    return this.provider.getRates({
      postalCode,
      weight,
      value,
    });
  }
}
