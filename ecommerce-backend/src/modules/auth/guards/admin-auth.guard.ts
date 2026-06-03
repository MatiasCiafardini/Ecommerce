import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'ADMIN']);

@Injectable()
export class AdminAuthGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const authUser = super.handleRequest(err, user, info, context);

    if (!ADMIN_ROLES.has(authUser?.role)) {
      throw new ForbiddenException('Admin access required');
    }

    return authUser;
  }
}
