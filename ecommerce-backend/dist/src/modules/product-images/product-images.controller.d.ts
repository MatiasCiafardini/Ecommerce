import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
export declare class ProductImagesController {
    private service;
    constructor(service: ProductImagesService);
    upload(productId: string, file: {
        filename: string;
    }): import("@prisma/client").Prisma.Prisma__ProductImageClient<{
        id: number;
        position: number;
        productId: number;
        url: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    create(productId: string, dto: CreateProductImageDto): import("@prisma/client").Prisma.Prisma__ProductImageClient<{
        id: number;
        position: number;
        productId: number;
        url: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(productId: string): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        position: number;
        productId: number;
        url: string;
    }[]>;
    remove(id: string): import("@prisma/client").Prisma.Prisma__ProductImageClient<{
        id: number;
        position: number;
        productId: number;
        url: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
