import { ProductOptionsService } from './product-options.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';
export declare class ProductOptionsController {
    private readonly service;
    constructor(service: ProductOptionsService);
    createOption(req: any, dto: CreateProductOptionDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
    }>;
    addValueToProduct(req: any, productId: string, dto: AddProductOptionValueDto): Promise<{
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
