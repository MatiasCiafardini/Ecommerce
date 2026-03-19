import { ProductOptionsService } from './product-options.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';
export declare class ProductOptionsController {
    private readonly service;
    constructor(service: ProductOptionsService);
    findAllOptions(req: any): Promise<{
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
    createOption(req: any, dto: CreateProductOptionDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        name: string;
    }>;
    addValueToProduct(req: any, productId: string, dto: AddProductOptionValueDto): Promise<{
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
    findValuesByProduct(req: any, productId: string): Promise<({
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
    removeValueFromProduct(req: any, productId: string, id: string): Promise<{
        id: number;
        createdAt: Date;
        productId: number;
        value: string;
        productOptionId: number;
    }>;
}
