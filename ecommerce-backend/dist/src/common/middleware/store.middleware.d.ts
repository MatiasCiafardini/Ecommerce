import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export interface StoreRequest extends Request {
    storeId?: number;
}
export declare class StoreMiddleware implements NestMiddleware {
    use(req: StoreRequest, res: Response, next: NextFunction): void;
}
