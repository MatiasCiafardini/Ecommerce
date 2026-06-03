import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { UpdateCurrentAuthDto } from './dto/update-current-auth.dto';
import { resolveStoreFeatures } from '../../common/store-features';
import { runtimeConfig } from '../../config/runtime-config';
import { normalizeEmail } from '../../common/utils/email.util';

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
  private readonly googleClient = new OAuth2Client();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async getStoreFeatureState(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        manualSalesEnabled: true,
      },
    });

    return resolveStoreFeatures(store ?? undefined);
  }

  async validateUser(email: string, password: string, storeId: number) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, storeId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.isPasswordValid(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async validateSuperAdmin(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: 'SUPER_ADMIN' as any,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.isPasswordValid(password, user.password);

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
    const normalizedEmail = normalizeEmail(email);
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new BadRequestException('Store no encontrada');
    }

    const existing = await this.prisma.customer.findFirst({
      where: {
        email: normalizedEmail,
        storeId: store.id,
      },
    });

    if (existing) {
      throw new BadRequestException('El cliente ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        storeId: store.id,
        firstName,
        lastName,
        phone,
      },
    });

    return this.toAuthEntity(customer, await this.getStoreFeatureState(store.id));
  }

  async validateSession(email: string, password: string, storeId: number) {
    const normalizedEmail = normalizeEmail(email);
    const adminUser = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        storeId,
      },
    });

    if (adminUser) {
      const passwordValid = await this.isPasswordValid(
        password,
        adminUser.password,
      );

      if (passwordValid) {
        return adminUser;
      }
    }

    return this.validateCustomer(normalizedEmail, password, storeId);
  }

  async loginWithGoogle(
    credential: string,
    storeId: number,
    clientId?: string,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      throw new BadRequestException('Store no encontrada');
    }

    const payload = await this.verifyGoogleCredential(credential, clientId);
    const googleId = payload.sub;
    const email = payload.email ? normalizeEmail(payload.email) : null;

    if (!googleId || !email) {
      throw new UnauthorizedException('Google account payload is incomplete');
    }

    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    const existingByGoogleId = await this.prisma.customer.findFirst({
      where: {
        storeId,
        googleId,
      },
    });

    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    const existingByEmail = await this.prisma.customer.findFirst({
      where: {
        storeId,
        email,
      },
    });

    if (existingByEmail) {
      return this.prisma.customer.update({
        where: { id: existingByEmail.id },
        data: {
          googleId,
          firstName: existingByEmail.firstName ?? this.pickFirstName(payload),
          lastName: existingByEmail.lastName ?? this.pickLastName(payload),
        },
      });
    }

    return this.prisma.customer.create({
      data: {
        storeId,
        email,
        googleId,
        firstName: this.pickFirstName(payload),
        lastName: this.pickLastName(payload),
      },
    });
  }

  async login(user: any) {
    const safeUser = this.toAuthEntity(
      user,
      await this.getStoreFeatureState(user.storeId),
    );
    const accessToken = this.signAccessToken(safeUser);

    return {
      access_token: accessToken,
      user: safeUser,
    };
  }

  signAccessToken(user: Pick<AuthEntity, 'id' | 'storeId' | 'role'>) {
    return this.jwtService.sign({
      sub: user.id,
      storeId: user.storeId,
      role: user.role,
    });
  }

  async validateCustomer(email: string, password: string, storeId: number) {
    const normalizedEmail = normalizeEmail(email);
    const customer = await this.prisma.customer.findFirst({
      where: {
        email: normalizedEmail,
        storeId,
      },
    });

    if (!customer || !customer.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.isPasswordValid(password, customer.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return customer;
  }

  async getCurrentAuthEntity(id: number, role: string, storeId: number) {
    if (role === 'SUPER_ADMIN') {
      const user = await this.prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!user || user.role !== ('SUPER_ADMIN' as any)) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.toAuthEntity(user);
    }

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

      return this.toAuthEntity(
        customer,
        await this.getStoreFeatureState(customer.storeId),
      );
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

    return this.toAuthEntity(
      user,
      await this.getStoreFeatureState(user.storeId),
    );
  }

  async getOptionalAuthEntity(
    id: number | undefined,
    role: string | undefined,
    storeId: number | undefined,
  ) {
    if (!id || !storeId) {
      return null;
    }

    try {
      return await this.getCurrentAuthEntity(id, role ?? 'CUSTOMER', storeId);
    } catch {
      return null;
    }
  }

  async updateCurrentAuthEntity(
    id: number,
    role: string,
    storeId: number,
    data: UpdateCurrentAuthDto,
  ) {
    if (role === 'SUPER_ADMIN') {
      const user = await this.prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!user || user.role !== ('SUPER_ADMIN' as any)) {
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

      return this.toAuthEntity(
        updatedCustomer,
        await this.getStoreFeatureState(updatedCustomer.storeId),
      );
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

    return this.toAuthEntity(
      updatedUser,
      await this.getStoreFeatureState(updatedUser.storeId),
    );
  }

  private toAuthEntity(
    user: any,
    storeFeatures = resolveStoreFeatures(undefined),
  ): AuthEntity {
    return {
      id: user.id,
      email: user.email,
      storeId: user.storeId,
      role: user.role ?? 'CUSTOMER',
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone ?? null,
      name: user.name ?? null,
      storeFeatures,
    };
  }

  private async isPasswordValid(password: string, passwordHash?: string | null) {
    if (!passwordHash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, passwordHash);
    } catch {
      return false;
    }
  }

  private getGoogleAudiences() {
    if (!runtimeConfig.googleClientIds.length) {
      throw new BadRequestException('Google login is not configured');
    }

    return runtimeConfig.googleClientIds;
  }

  private async verifyGoogleCredential(
    credential: string,
    clientId?: string,
  ) {
    const audiences = this.getGoogleAudiences();

    if (clientId && !audiences.includes(clientId)) {
      throw new UnauthorizedException('Unexpected Google client ID');
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: audiences,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID token');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  private pickFirstName(payload: TokenPayload) {
    if (payload.given_name?.trim()) {
      return payload.given_name.trim();
    }

    if (payload.name?.trim()) {
      return payload.name.trim().split(/\s+/)[0] ?? null;
    }

    return null;
  }

  private pickLastName(payload: TokenPayload) {
    if (payload.family_name?.trim()) {
      return payload.family_name.trim();
    }

    if (!payload.name?.trim()) {
      return null;
    }

    const parts = payload.name.trim().split(/\s+/);

    if (parts.length <= 1) {
      return null;
    }

    return parts.slice(1).join(' ');
  }
}
