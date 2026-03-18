import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
export declare class PaymentsService {
    private prisma;
    private mercadopago;
    private inventoryLockService;
    private fulfillmentService;
    constructor(prisma: PrismaService, mercadopago: MercadoPagoProvider, inventoryLockService: InventoryLockService, fulfillmentService: FulfillmentService);
    createPayment(storeId: number, orderId: number, dto: CreatePaymentDto, requester?: {
        sub: number;
        role?: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        storeId: number;
        status: string;
        idempotencyKey: string | null;
        orderId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        provider: string;
        externalId: string | null;
    }>;
    handleWebhook(body: any): Promise<{
        received: boolean;
    }>;
    private finalizeApprovedOrder;
    private cancelPendingOrder;
}
