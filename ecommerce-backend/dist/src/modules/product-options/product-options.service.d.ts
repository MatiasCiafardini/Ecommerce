import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';
export declare class ProductOptionsService {
    private prisma;
    constructor(prisma: PrismaService);
    createOption(storeId: number, dto: CreateProductOptionDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
    }>;
    addValueToProduct(storeId: number, productId: number, dto: AddProductOptionValueDto): Promise<{
        product: {
            id: number;
            title: string;
            slug: string;
        };
        productOption: {
            id: number;
            name: string;
            createdAt: Date;
            storeId: number;
        };
    } & {
        id: number;
        createdAt: Date;
        value: string;
        productId: number;
        productOptionId: number;
    }>;
}
