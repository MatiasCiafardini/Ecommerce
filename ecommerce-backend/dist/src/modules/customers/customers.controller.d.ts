import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(req: any, dto: CreateCustomerDto): Promise<{
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
    findAll(req: any): Promise<{
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
    }[]>;
    findOne(req: any, id: string): Promise<{
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
    } | null>;
    update(req: any, id: string, dto: UpdateCustomerDto): Promise<{
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
    remove(req: any, id: string): Promise<{
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
}
