import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
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
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<{
        id: number;
        name: string | null;
        createdAt: Date;
        email: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        storeId: number;
    }>;
    registerCustomer(email: string, password: string, storeId: number, firstName?: string, lastName?: string, phone?: string): Promise<AuthEntity>;
    login(user: any): Promise<{
        access_token: string;
        user: AuthEntity;
    }>;
    validateCustomer(email: string, password: string, storeId: number): Promise<{
        id: number;
        createdAt: Date;
        email: string;
        password: string | null;
        storeId: number;
        deletedAt: Date | null;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    private toAuthEntity;
}
export {};
