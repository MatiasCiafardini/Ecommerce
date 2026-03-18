import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
export declare class ProductImagesController {
    private service;
    constructor(service: ProductImagesService);
    create(productId: string, dto: CreateProductImageDto): import("@prisma/client").Prisma.Prisma__ProductImageClient<{
        id: number;
        productId: number;
        url: string;
        position: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(productId: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        productId: number;
        url: string;
        position: number;
    }[]>;
    remove(id: string): import("@prisma/client").Prisma.Prisma__ProductImageClient<{
        id: number;
        productId: number;
        url: string;
        position: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
