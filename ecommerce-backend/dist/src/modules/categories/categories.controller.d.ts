import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
export declare class CategoriesController {
    private service;
    constructor(service: CategoriesService);
    create(dto: CreateCategoryDto, req: any): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        slug: string;
        deletedAt: Date | null;
    }>;
    findAll(req: any): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        slug: string;
        deletedAt: Date | null;
    }[]>;
}
