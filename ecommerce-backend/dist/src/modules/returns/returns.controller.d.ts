import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
export declare class ReturnsController {
    private returnsService;
    constructor(returnsService: ReturnsService);
    create(req: any, dto: CreateReturnDto): Promise<{
        items: {
            id: number;
            quantity: number;
            orderItemId: number;
            returnId: number;
        }[];
    } & {
        id: number;
        storeId: number;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ReturnStatus;
        orderId: number;
        reason: string | null;
    }>;
    approve(req: any, id: string, dto: ApproveReturnDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ReturnStatus;
        orderId: number;
        reason: string | null;
    } | {
        success: boolean;
        refund: any;
    }>;
    findAll(req: any): Promise<({
        refund: {
            id: number;
            storeId: number;
            createdAt: Date;
            orderId: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            returnId: number;
            paymentId: number | null;
        } | null;
        items: {
            id: number;
            quantity: number;
            orderItemId: number;
            returnId: number;
        }[];
    } & {
        id: number;
        storeId: number;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ReturnStatus;
        orderId: number;
        reason: string | null;
    })[]>;
}
