import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UpdateCurrentAuthDto } from './dto/update-current-auth.dto';
import { resolveStoreFeatures } from '../../common/store-features';

type AuthEntity = {
  id: number;
  email: string;
  storeId: number;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  name?: string | null;
  storeFeatures?: {
    manualSalesEnabled: boolean;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string, storeId: number) {
    const user = await this.prisma.user.findFirst({
      where: { email, storeId },
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

  async validateSession(email: string, password: string, storeId: number) {
    const adminUser = await this.prisma.user.findFirst({
      where: {
        email,
        storeId,
      },
    });

    if (adminUser) {
      const passwordValid = await bcrypt.compare(password, adminUser.password);

      if (passwordValid) {
        return adminUser;
      }
    }

    return this.validateCustomer(email, password, storeId);
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

  async getCurrentAuthEntity(id: number, role: string, storeId: number) {
    const isCustomer = !role || role === 'CUSTOMER';

    if (isCustomer) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id,
          storeId,
        },
      });

      if (!customer) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.toAuthEntity(customer);
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        storeId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.toAuthEntity(user);
  }

  async updateCurrentAuthEntity(
    id: number,
    role: string,
    storeId: number,
    data: UpdateCurrentAuthDto,
  ) {
    const isCustomer = !role || role === 'CUSTOMER';

    if (isCustomer) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id,
          storeId,
        },
      });

      if (!customer) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const customerData: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        password?: string;
      } = {};

      if (data.firstName !== undefined) customerData.firstName = data.firstName;
      if (data.lastName !== undefined) customerData.lastName = data.lastName;
      if (data.phone !== undefined) customerData.phone = data.phone;
      if (data.password) {
        customerData.password = await bcrypt.hash(data.password, 10);
      }

      const updatedCustomer = await this.prisma.customer.update({
        where: { id },
        data: customerData,
      });

      return this.toAuthEntity(updatedCustomer);
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        storeId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userData: {
      name?: string | null;
      password?: string;
    } = {};

    if (data.name !== undefined) {
      userData.name = data.name;
    }

    if (data.password) {
      userData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: userData,
    });

    return this.toAuthEntity(updatedUser);
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
      storeFeatures: resolveStoreFeatures(user.storeId),
    };
  }
}
