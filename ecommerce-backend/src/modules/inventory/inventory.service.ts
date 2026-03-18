import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateInventoryDto, storeId: number) {
    return this.prisma.inventory.create({
      data: {
        storeId,
        variantId: dto.variantId,
        quantity: dto.quantity,
      },
    });
  }

  async findByVariant(variantId: number, storeId: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return inventory;
  }

  async updateStock(variantId: number, quantity: number, storeId: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return this.prisma.inventory.update({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
      data: {
        quantity,
      },
    });
  }
}
