import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';

@Injectable()
export class CustomerAddressesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerAddressDto) {
    return this.prisma.customerAddress.create({
      data: {
        customerId: dto.customerId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        address1: dto.address1,
        address2: dto.address2,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        country: dto.country,
      },
    });
  }

  async findByCustomer(customerId: number) {
    return this.prisma.customerAddress.findMany({
      where: {
        customerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
