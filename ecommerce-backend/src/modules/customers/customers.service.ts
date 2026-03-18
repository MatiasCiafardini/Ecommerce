import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as bcrypt from 'bcrypt';

const customerSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: number, data: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        ...data,
        storeId,
      },
      select: customerSelect,
    });
  }

  async findAll(storeId: number) {
    return this.prisma.customer.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: customerSelect,
    });
  }

  async findOne(storeId: number, id: number) {
    return this.prisma.customer.findFirst({
      where: {
        id,
        storeId,
      },
      select: customerSelect,
    });
  }

  async findOneOrThrow(storeId: number, id: number) {
    const customer = await this.findOne(storeId, id);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async findByEmail(storeId: number, email: string) {
    return this.prisma.customer.findFirst({
      where: {
        storeId,
        email,
      },
      select: customerSelect,
    });
  }

  async update(storeId: number, id: number, data: UpdateCustomerDto) {
    await this.findOneOrThrow(storeId, id);

    const updateData: Record<string, unknown> = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateData,
      select: customerSelect,
    });
  }

  async remove(storeId: number, id: number) {
    await this.findOneOrThrow(storeId, id);

    return this.prisma.customer.delete({
      where: { id },
      select: customerSelect,
    });
  }

  async upsertCustomer(storeId: number, data: CreateCustomerDto) {
    return this.prisma.customer.upsert({
      where: {
        storeId_email: {
          storeId,
          email: data.email,
        },
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
      create: {
        ...data,
        storeId,
      },
      select: customerSelect,
    });
  }
}
