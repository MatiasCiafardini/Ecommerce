import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface StoreRequest extends Request {
  storeId?: number;
}

@Injectable()
export class StoreMiddleware implements NestMiddleware {
  use(req: StoreRequest, res: Response, next: NextFunction) {
    const storeIdHeader = req.headers['x-store-id'];

    if (!storeIdHeader) {
      throw new BadRequestException('x-store-id header is required');
    }

    const storeId = Number(storeIdHeader);

    if (isNaN(storeId)) {
      throw new BadRequestException('x-store-id must be a number');
    }

    req.storeId = storeId;

    next();
  }
}
