import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
export declare class CategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateCategoryDto, storeId: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        slug: string;
        deletedAt: Date | null;
    }>;
    findAll(storeId: number): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        slug: string;
        deletedAt: Date | null;
    }[]>;
}
