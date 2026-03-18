import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async createCart(storeId: number, customerId: number) {
    await this.ensureCustomer(storeId, customerId);

    const existingCart = await this.prisma.cart.findFirst({
      where: {
        storeId,
        customerId,
        status: 'active',
      },
    });

    if (existingCart) {
      return existingCart;
    }

    return this.prisma.cart.create({
      data: {
        storeId,
        customerId,
      },
    });
  }

  async getCart(storeId: number, cartId: number, customerId: number) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        storeId,
        customerId,
        status: 'active',
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                inventories: {
                  where: {
                    storeId,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  async addItem(
    storeId: number,
    cartId: number,
    customerId: number,
    dto: AddItemDto,
  ) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        storeId,
        customerId,
        status: 'active',
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        product: {
          storeId,
        },
      },
      include: {
        inventories: {
          where: {
            storeId,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const inventory = variant.inventories[0];
    const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);

    if (dto.quantity > available) {
      throw new BadRequestException('Not enough stock');
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        variantId: dto.variantId,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;

      if (newQuantity > available) {
        throw new BadRequestException('Not enough stock');
      }

      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId,
        variantId: dto.variantId,
        quantity: dto.quantity,
      },
    });
  }

  async updateItem(
    storeId: number,
    cartId: number,
    itemId: number,
    customerId: number,
    dto: UpdateItemDto,
  ) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId,
        cart: {
          storeId,
          customerId,
        },
      },
      include: {
        variant: {
          include: {
            inventories: {
              where: {
                storeId,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const inventory = item.variant.inventories[0];
    const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);

    if (dto.quantity > available) {
      throw new BadRequestException('Not enough stock');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
      },
    });
  }

  async removeItem(
    storeId: number,
    cartId: number,
    itemId: number,
    customerId: number,
  ) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId,
        cart: {
          storeId,
          customerId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  async clearCart(storeId: number, cartId: number, customerId: number) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        storeId,
        customerId,
        status: 'active',
      },
      select: { id: true },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.prisma.cartItem.deleteMany({
      where: {
        cartId,
      },
    });
  }

  private async ensureCustomer(storeId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        storeId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new ForbiddenException('Customer does not belong to this store');
    }
  }
}
