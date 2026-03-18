import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class StoreMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const storeId = req.headers['x-store-id'];

    if (!storeId) {
      throw new BadRequestException('x-store-id header is required');
    }

    req.storeId = Number(storeId);

    next();
  }
}
