import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizeEmail } from '../../common/utils/email.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreLocationDto } from './dto/create-store-location.dto';
import { CreateStoreLocationUserDto } from './dto/create-store-location-user.dto';
import { UpdateStoreLocationDto } from './dto/update-store-location.dto';
import { UpdateStoreLocationUserDto } from './dto/update-store-location-user.dto';

@Injectable()
export class StoreLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(storeId: number) {
    const [locations, users] = await Promise.all([
      this.prisma.storeLocation.findMany({
        where: { storeId },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              users: true,
              cashRegisterSessions: true,
              orders: true,
              currentAccounts: true,
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          storeId,
          role: { in: ['OWNER', 'ADMIN', 'STAFF'] as any },
        },
        orderBy: [{ role: 'asc' }, { email: 'asc' }],
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          storeLocationId: true,
          storeLocation: {
            select: {
              id: true,
              name: true,
              active: true,
            },
          },
        },
      }),
    ]);

    return { locations, users };
  }

  async createLocation(storeId: number, dto: CreateStoreLocationDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Location name is required');
    }

    return this.prisma.storeLocation.create({
      data: {
        storeId,
        name,
        address: this.optional(dto.address),
      },
    });
  }

  async updateLocation(storeId: number, locationId: number, dto: UpdateStoreLocationDto) {
    await this.ensureLocation(storeId, locationId);

    return this.prisma.storeLocation.update({
      where: { id: locationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: this.optional(dto.address) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async createUser(storeId: number, dto: CreateStoreLocationUserDto) {
    const email = normalizeEmail(dto.email);

    if (dto.storeLocationId) {
      await this.ensureLocation(storeId, dto.storeLocationId);
    }

    const existing = await this.prisma.user.findFirst({
      where: { storeId, email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(`Ya existe un usuario con email ${email}.`);
    }

    return this.prisma.user.create({
      data: {
        storeId,
        email,
        password: await bcrypt.hash(dto.password, 10),
        name: this.optional(dto.name),
        role: dto.role as Role,
        storeLocationId: dto.storeLocationId ?? null,
      },
      select: this.userSelect(),
    });
  }

  async updateUser(storeId: number, userId: number, dto: UpdateStoreLocationUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, storeId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.storeLocationId) {
      await this.ensureLocation(storeId, dto.storeLocationId);
    }

    const email = dto.email !== undefined ? normalizeEmail(dto.email) : undefined;

    if (email) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          storeId,
          email,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (conflict) {
        throw new BadRequestException(`Ya existe un usuario con email ${email}.`);
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(email ? { email } : {}),
        ...(dto.password ? { password: await bcrypt.hash(dto.password, 10) } : {}),
        ...(dto.name !== undefined ? { name: this.optional(dto.name) } : {}),
        ...(dto.role ? { role: dto.role as Role } : {}),
        ...(dto.storeLocationId !== undefined
          ? { storeLocationId: dto.storeLocationId || null }
          : {}),
      },
      select: this.userSelect(),
    });
  }

  private async ensureLocation(storeId: number, locationId: number) {
    const location = await this.prisma.storeLocation.findFirst({
      where: { id: locationId, storeId },
      select: { id: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  private optional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      storeLocationId: true,
      storeLocation: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    } as const;
  }
}
