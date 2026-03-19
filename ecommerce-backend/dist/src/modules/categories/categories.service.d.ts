import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
export declare class CategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateCategoryDto, storeId: number): Promise<{
        id: number;
        slug: string;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        name: string;
    }>;
    findAll(storeId: number): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        slug: string;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        name: string;
    }[]>;
}
