import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationStatus } from '../../../common/contracts';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { ALLOW_INACTIVE_ORGANIZATION_KEY } from '../decorators/allow-inactive-organization.decorator';
import { OrganizationsService } from '../organizations.service';

// Runs after JwtAuthGuard (needs request.user.organizationId) and before PermissionsGuard — a
// pending org's SUPERADMIN (exactly what signup creates) would otherwise sail through
// PermissionsGuard's unconditional SUPERADMIN bypass. See auth.module.ts for the registration order
// and why it's load-bearing.
@Injectable()
export class OrganizationStatusGuard implements CanActivate {
  constructor(private reflector: Reflector, private organizations: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const allowInactive = this.reflector.getAllAndOverride<boolean>(ALLOW_INACTIVE_ORGANIZATION_KEY, [context.getHandler(), context.getClass()]);
    if (allowInactive) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException({ statusCode: 403, message: 'Missing authenticated user', code: 'ORGANIZATION_NOT_FOUND' });

    const status = await this.organizations.getStatusBySlug(user.organizationId);
    if (!status) {
      throw new ForbiddenException({ statusCode: 403, message: 'Organization not found', code: 'ORGANIZATION_NOT_FOUND' });
    }
    if (status !== OrganizationStatus.ACTIVE) {
      const messages: Record<string, string> = {
        [OrganizationStatus.PENDING]: 'Your organization is pending approval by the platform administrator.',
        [OrganizationStatus.SUSPENDED]: 'Your organization has been suspended.',
        [OrganizationStatus.REJECTED]: 'Your organization\'s signup was rejected.',
      };
      throw new ForbiddenException({ statusCode: 403, message: messages[status], code: `ORGANIZATION_${status}` });
    }
    return true;
  }
}
