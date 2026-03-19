import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(storeId: number, data: CreateCustomerDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    findAll(storeId: number): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }[]>;
    findOne(storeId: number, id: number): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    } | null>;
    findOneOrThrow(storeId: number, id: number): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    findByEmail(storeId: number, email: string): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    } | null>;
    update(storeId: number, id: number, data: UpdateCustomerDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    remove(storeId: number, id: number): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    upsertCustomer(storeId: number, data: CreateCustomerDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
}
