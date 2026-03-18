import { PrismaService } from '../../prisma/prisma.service';
import type { ShippingProvider } from './providers/shipping-provider.interface';
export declare class ShippingService {
    private prisma;
    private provider;
    constructor(prisma: PrismaService, provider: ShippingProvider);
    getOptions(storeId: number, cartId: number, customerId: number, postalCode: string): Promise<import("./providers/shipping-provider.interface").ShippingRate[]>;
}
