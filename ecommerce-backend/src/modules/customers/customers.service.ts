import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: number, data: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        ...data,
        storeId,
      },
    });
  }

  async findAll(storeId: number) {
    return this.prisma.customer.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(storeId: number, id: number) {
    return this.prisma.customer.findFirst({
      where: {
        id,
        storeId,
      },
    });
  }

  async findByEmail(storeId: number, email: string) {
    return this.prisma.customer.findFirst({
      where: {
        storeId,
        email,
      },
    });
  }

  async update(storeId: number, id: number, data: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(storeId: number, id: number) {
    return this.prisma.customer.delete({
      where: { id },
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
    });
  }
}
