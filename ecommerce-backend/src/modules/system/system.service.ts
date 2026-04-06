import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSystemStoreDto } from './dto/create-system-store.dto';
import * as bcrypt from 'bcrypt';

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//i, '')
    .split('/')[0]
    .replace(/\.$/, '');
}

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async listStores() {
    const stores = await this.prisma.store.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        users: {
          where: {
            role: {
              in: ['OWNER', 'ADMIN'] as any,
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return stores.map((store) => ({
      id: store.id,
      name: store.name,
      domain: store.domain,
      createdAt: store.createdAt,
      owner: store.users[0] ?? null,
      adminCount: store.users.length,
    }));
  }

  async createStore(dto: CreateSystemStoreDto) {
    const normalizedDomain = normalizeDomain(dto.domain);
    const normalizedEmail = dto.ownerEmail.trim().toLowerCase();

    const [existingStore, existingOwner] = await Promise.all([
      this.prisma.store.findUnique({
        where: { domain: normalizedDomain },
        select: { id: true },
      }),
      this.prisma.user.findFirst({
        where: { email: normalizedEmail },
        select: { id: true, storeId: true },
      }),
    ]);

    if (existingStore) {
      throw new BadRequestException(
        `A store already exists for domain "${normalizedDomain}"`,
      );
    }

    if (existingOwner) {
      throw new BadRequestException(
        `A user with email "${normalizedEmail}" already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);

    const store = await this.prisma.$transaction(async (tx) => {
      const createdStore = await tx.store.create({
        data: {
          name: dto.name.trim(),
          domain: normalizedDomain,
        },
      });

      const owner = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: dto.ownerName?.trim() || null,
          role: 'OWNER' as any,
          storeId: createdStore.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        id: createdStore.id,
        name: createdStore.name,
        domain: createdStore.domain,
        createdAt: createdStore.createdAt,
        owner,
      };
    });

    return store;
  }
}
