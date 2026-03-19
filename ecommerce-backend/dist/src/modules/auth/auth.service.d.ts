import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UpdateCurrentAuthDto } from './dto/update-current-auth.dto';
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
        storeId: number;
        createdAt: Date;
        name: string | null;
        email: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    registerCustomer(email: string, password: string, storeId: number, firstName?: string, lastName?: string, phone?: string): Promise<AuthEntity>;
    validateSession(email: string, password: string, storeId: number): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        name: string | null;
        email: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
    } | {
        id: number;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        email: string;
        password: string | null;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    login(user: any): Promise<{
        access_token: string;
        user: AuthEntity;
    }>;
    validateCustomer(email: string, password: string, storeId: number): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        email: string;
        password: string | null;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    getCurrentAuthEntity(id: number, role: string, storeId: number): Promise<AuthEntity>;
    updateCurrentAuthEntity(id: number, role: string, storeId: number, data: UpdateCurrentAuthDto): Promise<AuthEntity>;
    private toAuthEntity;
}
export {};
