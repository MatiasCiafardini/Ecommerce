import { CustomerAddressesService } from './customer-addresses.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
export declare class CustomerAddressesController {
    private readonly service;
    constructor(service: CustomerAddressesService);
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
    findByCustomer(customerId: string): Promise<{
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
