import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class SuperAdminAuthGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const authUser = super.handleRequest(err, user, info, context);

    if (authUser?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin access required');
    }

    return authUser;
  }
}
