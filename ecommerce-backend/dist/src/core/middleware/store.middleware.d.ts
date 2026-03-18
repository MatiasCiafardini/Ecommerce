import { NestMiddleware } from '@nestjs/common';
export declare class StoreMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void): void;
}
