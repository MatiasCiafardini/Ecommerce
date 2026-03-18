import { Request } from 'express';
import { ShippingService } from './shipping.service';
import { GetShippingOptionsDto } from './dto/get-shipping-options.dto';
export declare class ShippingController {
    private readonly shippingService;
    constructor(shippingService: ShippingService);
    getOptions(req: Request & {
        storeId: number;
    }, dto: GetShippingOptionsDto): Promise<import("./providers/shipping-provider.interface").ShippingRate[]>;
}
