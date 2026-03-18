import { DiscountType } from '@prisma/client';
export declare class CreateDiscountDto {
    name: string;
    type: DiscountType;
    value?: number;
    minimumAmount?: number;
    automatic?: boolean;
}
