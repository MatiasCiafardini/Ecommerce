import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
export declare class CategoriesController {
    private service;
    constructor(service: CategoriesService);
    create(dto: CreateCategoryDto, req: any): Promise<{
        id: number;
        slug: string;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        name: string;
    }>;
    findAll(req: any): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        slug: string;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        name: string;
    }[]>;
}
