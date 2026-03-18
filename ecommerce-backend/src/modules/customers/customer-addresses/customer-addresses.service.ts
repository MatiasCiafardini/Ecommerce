import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

const addressSelect = {
  id: true,
  customerId: true,
  storeId: true,
  firstName: true,
  lastName: true,
  phone: true,
  address1: true,
  address2: true,
  city: true,
  state: true,
  zip: true,
  country: true,
  isDefault: true,
  createdAt: true,
} as const;

@Injectable()
export class CustomerAddressesService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: number, customerId: number, dto: CreateCustomerAddressDto) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        storeId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customerAddress.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        address1: dto.address1,
        address2: dto.address2,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        country: dto.country,
        store: {
          connect: {
            id: storeId,
          },
        },
        customer: {
          connect: {
            id: customerId,
          },
        },
      },
      select: addressSelect,
    });
  }

  async findByCustomer(storeId: number, customerId: number) {
    return this.prisma.customerAddress.findMany({
      where: {
        customerId,
        customer: {
          storeId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: addressSelect,
    });
  }

  async update(
    storeId: number,
    customerId: number,
    addressId: number,
    dto: UpdateCustomerAddressDto,
  ) {
    await this.findOneOrThrow(storeId, customerId, addressId);

    return this.prisma.customerAddress.update({
      where: {
        id: addressId,
      },
      data: {
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
      select: addressSelect,
    });
  }

  async remove(storeId: number, customerId: number, addressId: number) {
    await this.findOneOrThrow(storeId, customerId, addressId);

    return this.prisma.customerAddress.delete({
      where: {
        id: addressId,
      },
      select: addressSelect,
    });
  }

  async findOneOrThrow(storeId: number, customerId: number, addressId: number) {
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
        customer: {
          storeId,
        },
      },
      select: addressSelect,
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }
}
