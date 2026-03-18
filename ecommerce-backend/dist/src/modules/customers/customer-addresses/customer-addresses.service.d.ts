import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
export declare class CustomerAddressesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateCustomerAddressDto): Promise<{
        id: number;
        createdAt: Date;
        customerId: number;
        firstName: string;
        lastName: string;
        phone: string | null;
        address1: string;
        address2: string | null;
        city: string;
        state: string | null;
        zip: string;
        country: string;
        isDefault: boolean;
    }>;
    findByCustomer(customerId: number): Promise<{
        id: number;
        createdAt: Date;
        customerId: number;
        firstName: string;
        lastName: string;
        phone: string | null;
        address1: string;
        address2: string | null;
        city: string;
        state: string | null;
        zip: string;
        country: string;
        isDefault: boolean;
    }[]>;
}
