import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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

  async registerCustomer(email: string, password: string, storeId: number) {
    // 🔥 limpiar dominio (sacar puerto)
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
      },
    });

    return customer;
  }
  async login(user: any) {
    const payload = {
      sub: user.id,
      storeId: user.storeId,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user, // 🔥 importante para frontend
    };
  }
  async validateCustomer(email: string, password: string, storeId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        email,
        storeId,
      },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!customer || !customer.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, customer.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return customer;
  }
}
