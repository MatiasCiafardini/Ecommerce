import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

const CATALOG_MANAGER_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'ADMIN']);

@Injectable()
export class CatalogManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const role = request.user?.role;

    if (!CATALOG_MANAGER_ROLES.has(role)) {
      throw new ForbiddenException(
        'No tenes permiso para modificar productos, variantes o stock.',
      );
    }

    return true;
  }
}
