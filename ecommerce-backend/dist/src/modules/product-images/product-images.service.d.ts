import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
export declare class ProductImagesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(productId: number, dto: CreateProductImageDto): import("@prisma/client").Prisma.Prisma__ProductImageClient<{
        id: number;
        productId: number;
        url: string;
        position: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findByProduct(productId: number): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        productId: number;
        url: string;
        position: number;
    }[]>;
    delete(id: number): import("@prisma/client").Prisma.Prisma__ProductImageClient<{
        id: number;
        productId: number;
        url: string;
        position: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
