import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(req: any, dto: CreateCustomerDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    findAll(req: any): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }[]>;
    findMe(req: any): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    findOne(req: any, id: string): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    } | null>;
    updateMe(req: any, dto: UpdateCustomerDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    update(req: any, id: string, dto: UpdateCustomerDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        email: string;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
    }>;
    remove(req: any, id: string): Promise<{
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
