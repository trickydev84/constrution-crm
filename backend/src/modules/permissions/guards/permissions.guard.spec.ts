import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from '../permissions.service';
import { Resource, Role } from '../../../common/contracts';

function makeContext(user: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let permissions: { check: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    permissions = { check: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector, permissions as unknown as PermissionsService);
  });

  it('allows the request when the route carries no @RequirePermission metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(makeContext({ role: Role.SALES }))).resolves.toBe(true);
    expect(permissions.check).not.toHaveBeenCalled();
  });

  it('rejects when the route is gated but request.user is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: Resource.LEADS, action: 'view' });
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(ForbiddenException);
  });

  it('SUPERADMIN always bypasses, without ever calling permissions.check', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: Resource.LEADS, action: 'write' });
    await expect(guard.canActivate(makeContext({ role: Role.SUPERADMIN }))).resolves.toBe(true);
    expect(permissions.check).not.toHaveBeenCalled();
  });

  it('allows a non-SUPERADMIN role with a matching grant', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: Resource.PROJECTS, action: 'view' });
    permissions.check.mockResolvedValue(true);
    const user = { role: Role.PROJECT_MANAGER, organizationId: 'default' };
    await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    expect(permissions.check).toHaveBeenCalledWith(Role.PROJECT_MANAGER, Resource.PROJECTS, 'default', 'view');
  });

  it('denies a role without a matching grant, with a descriptive message', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: Resource.USERS, action: 'view' });
    permissions.check.mockResolvedValue(false);
    const user = { role: Role.SUPERVISOR, organizationId: 'default' };
    await expect(guard.canActivate(makeContext(user))).rejects.toThrow(
      new ForbiddenException("Missing 'view' permission on 'USERS'"),
    );
  });
});
