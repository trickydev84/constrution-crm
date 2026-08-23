import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Resource, Role } from '../../../common/contracts';
import { PERMISSION_KEY, PermissionAction } from '../../auth/decorators/require-permission.decorator';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissions: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{ resource: Resource; action: PermissionAction }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Insufficient permissions');
    if (user.role === Role.SUPERADMIN) return true;

    const allowed = await this.permissions.check(user.role, required.resource, user.organizationId, required.action);
    if (!allowed) throw new ForbiddenException(`Missing '${required.action}' permission on '${required.resource}'`);
    return true;
  }
}
