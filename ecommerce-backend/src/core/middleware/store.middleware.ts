import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class StoreMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const path = String(req.path || req.originalUrl || '');
    const bypassPaths = [
      '/api/payments/webhook',
      '/api/integrations/enviopack/webhook',
    ];

    if (bypassPaths.some((candidate) => path.startsWith(candidate))) {
      return next();
    }

    const storeId = req.headers['x-store-id'];

    if (!storeId) {
      throw new BadRequestException('x-store-id header is required');
    }

    req.storeId = Number(storeId);

    next();
  }
}
