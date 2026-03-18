import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

type AuthEntity = {
  id: number;
  email: string;
  storeId: number;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  name?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async registerCustomer(
    email: string,
    password: string,
    storeId: number,
    firstName?: string,
    lastName?: string,
    phone?: string,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new BadRequestException('Store no encontrada');
    }

    const existing = await this.prisma.customer.findFirst({
      where: {
        email,
        storeId: store.id,
      },
    });

    if (existing) {
      throw new BadRequestException('El cliente ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        email,
        password: hashedPassword,
        storeId: store.id,
        firstName,
        lastName,
        phone,
      },
    });

    return this.toAuthEntity(customer);
  }

  async login(user: any) {
    const safeUser = this.toAuthEntity(user);
    const payload = {
      sub: safeUser.id,
      storeId: safeUser.storeId,
      role: safeUser.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: safeUser,
    };
  }

  async validateCustomer(email: string, password: string, storeId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        email,
        storeId,
      },
    });

    if (!customer || !customer.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, customer.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return customer;
  }

  private toAuthEntity(user: any): AuthEntity {
    return {
      id: user.id,
      email: user.email,
      storeId: user.storeId,
      role: user.role ?? 'CUSTOMER',
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone ?? null,
      name: user.name ?? null,
    };
  }
}
