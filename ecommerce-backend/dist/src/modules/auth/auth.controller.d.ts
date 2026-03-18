import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request } from 'express';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: any;
    }>;
    registerCustomer(body: any, req: Request): Promise<{
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
    loginCustomer(body: any, req: Request): Promise<{
        access_token: string;
        user: any;
    }>;
}
