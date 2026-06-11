import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as bcrypt from 'bcrypt';
import { normalizeEmail } from '../../common/utils/email.util';

const customerSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  document: true,
  notes: true,
  source: true,
  storeId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(storeId: number, data: CreateCustomerDto) {
    const normalizedEmail = this.normalizeOptionalEmail(data.email);
    this.ensureLocalCustomerIdentity(data, normalizedEmail);
    const address = this.normalizeOptionalAddress(storeId, data);

    return this.prisma.customer.create({
      data: {
        email: normalizedEmail,
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
        phone: data.phone?.trim() || null,
        document: data.document?.trim() || null,
        notes: data.notes?.trim() || null,
        source: this.normalizeSource(data.source),
        storeId,
        ...(address
          ? {
              addresses: {
                create: address,
              },
            }
          : {}),
      },
      select: customerSelect,
    });
  }

  async findAll(storeId: number, search = '', source?: string) {
    const normalizedSearch = search.trim();
    const normalizedSource = this.normalizeOptionalSource(source);

    return this.prisma.customer.findMany({
      where: {
        storeId,
        ...(normalizedSource ? { source: normalizedSource } : {}),
        ...(normalizedSearch
          ? {
              OR: [
                { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
                { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
                { phone: { contains: normalizedSearch, mode: 'insensitive' } },
                { email: { contains: normalizedSearch, mode: 'insensitive' } },
                { document: { contains: normalizedSearch, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: normalizedSearch
        ? [{ firstName: 'asc' }, { lastName: 'asc' }, { createdAt: 'desc' }]
        : { createdAt: 'desc' },
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
    const normalizedEmail = normalizeEmail(email);
    return this.prisma.customer.findFirst({
      where: {
        storeId,
        email: normalizedEmail,
      },
      select: customerSelect,
    });
  }

  async update(storeId: number, id: number, data: UpdateCustomerDto) {
    await this.findOneOrThrow(storeId, id);

    const normalizedEmail =
      data.email !== undefined ? this.normalizeOptionalEmail(data.email) : undefined;

    if (data.email !== undefined) {
      this.ensureLocalCustomerIdentity(data, normalizedEmail);
    }

    const updateData: Record<string, unknown> = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName?.trim() || null;
    }

    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName?.trim() || null;
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone?.trim() || null;
    }

    if (data.document !== undefined) {
      updateData.document = data.document?.trim() || null;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    if (data.email !== undefined) {
      updateData.email = normalizedEmail;
    }

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
    const normalizedEmail = this.normalizeOptionalEmail(data.email);
    const source = this.normalizeSource(data.source, 'storefront');

    if (!normalizedEmail) {
      return this.create(storeId, data);
    }

    return this.prisma.customer.upsert({
      where: {
        storeId_email: {
          storeId,
          email: normalizedEmail,
        },
      },
      update: {
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
        phone: data.phone?.trim() || null,
        document: data.document?.trim() || null,
        notes: data.notes?.trim() || null,
        source,
      },
      create: {
        email: normalizedEmail,
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
        phone: data.phone?.trim() || null,
        document: data.document?.trim() || null,
        notes: data.notes?.trim() || null,
        source,
        storeId,
      },
      select: customerSelect,
    });
  }

  private normalizeOptionalEmail(email?: string | null) {
    const trimmed = email?.trim();
    return trimmed ? normalizeEmail(trimmed) : null;
  }

  private normalizeSource(source?: string | null, fallback = 'admin') {
    return this.normalizeOptionalSource(source) ?? fallback;
  }

  private normalizeOptionalSource(source?: string | null) {
    const normalized = source?.trim().toLowerCase();
    return ['storefront', 'current_account', 'admin'].includes(normalized ?? '')
      ? normalized
      : null;
  }

  private normalizeOptionalAddress(storeId: number, data: CreateCustomerDto) {
    const rawAddress = data.address;
    const hasAddress = Boolean(
      [
        rawAddress?.address1,
        rawAddress?.address2,
        rawAddress?.city,
        rawAddress?.state,
        rawAddress?.zip,
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
    );

    if (!hasAddress) {
      return null;
    }

    const firstName = data.firstName?.trim() || 'Cliente';
    const lastName = data.lastName?.trim() || '-';

    return {
      firstName,
      lastName,
      phone: data.phone?.trim() || null,
      address1: rawAddress?.address1?.trim() || 'Direccion no informada',
      address2: rawAddress?.address2?.trim() || null,
      city: rawAddress?.city?.trim() || 'Sin localidad',
      state: rawAddress?.state?.trim() || null,
      zip: rawAddress?.zip?.trim() || '0000',
      country: 'AR',
      isDefault: true,
      store: {
        connect: {
          id: storeId,
        },
      },
    };
  }

  private ensureLocalCustomerIdentity(
    data: Pick<CreateCustomerDto, 'firstName' | 'lastName' | 'phone'>,
    normalizedEmail?: string | null,
  ) {
    if (normalizedEmail) {
      return;
    }

    const hasName = Boolean(
      [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
    );

    if (!hasName) {
      throw new BadRequestException(
        'Para crear un cliente sin email, nombre o apellido son obligatorios.',
      );
    }
  }
}
