import { PrismaService } from '../../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';
export declare class ReturnsService {
    private prisma;
    private inventoryLockService;
    private mercadopago;
    constructor(prisma: PrismaService, inventoryLockService: InventoryLockService, mercadopago: MercadoPagoProvider);
    createReturn(storeId: number, dto: CreateReturnDto): Promise<{
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
    approveReturn(storeId: number, returnId: number, dto: ApproveReturnDto): Promise<{
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
    findAll(storeId: number): Promise<({
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
