import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';
export declare class ProductOptionsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllOptions(storeId: number): Promise<{
        reusableValues: {
            id: number;
            value: string;
        }[];
        values: {
            id: number;
            productId: number;
            value: string;
        }[];
        id: number;
        storeId: number;
        createdAt: Date;
        name: string;
    }[]>;
    createOption(storeId: number, dto: CreateProductOptionDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        name: string;
    }>;
    addValueToProduct(storeId: number, productId: number, dto: AddProductOptionValueDto): Promise<{
        product: {
            id: number;
            title: string;
            slug: string;
        };
        productOption: {
            id: number;
            storeId: number;
            createdAt: Date;
            name: string;
        };
    } & {
        id: number;
        createdAt: Date;
        productId: number;
        value: string;
        productOptionId: number;
    }>;
    findValuesByProduct(storeId: number, productId: number): Promise<({
        productOption: {
            id: number;
            name: string;
        };
    } & {
        id: number;
        createdAt: Date;
        productId: number;
        value: string;
        productOptionId: number;
    })[]>;
    removeValueFromProduct(storeId: number, productId: number, valueId: number): Promise<{
        id: number;
        createdAt: Date;
        productId: number;
        value: string;
        productOptionId: number;
    }>;
}
