import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createPayment(req: any, orderId: string, dto: CreatePaymentDto): Promise<{
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
    webhook(body: any): Promise<{
        received: boolean;
    }>;
}
