import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { Request } from 'express';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            storeId: number;
            role: string;
            firstName?: string | null;
            lastName?: string | null;
            phone?: string | null;
            name?: string | null;
        };
    }>;
    registerCustomer(body: RegisterDto, req: Request): Promise<{
        id: number;
        email: string;
        storeId: number;
        role: string;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        name?: string | null;
    }>;
    loginCustomer(body: LoginDto, req: Request): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            storeId: number;
            role: string;
            firstName?: string | null;
            lastName?: string | null;
            phone?: string | null;
            name?: string | null;
        };
    }>;
}
