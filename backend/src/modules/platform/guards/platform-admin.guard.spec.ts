import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminsService } from '../platform-admins.service';

function makeContext(authHeader?: string) {
  const request: any = { headers: authHeader ? { authorization: authHeader } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext & { __request: any };
}

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;
  let jwt: { verifyAsync: jest.Mock };
  let admins: { findById: jest.Mock };

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    admins = { findById: jest.fn() };
    guard = new PlatformAdminGuard(jwt as unknown as JwtService, admins as unknown as PlatformAdminsService);
  });

  it('rejects a request with no Authorization header', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a token that fails verification (e.g. signed with the org JWT_SECRET instead of PLATFORM_JWT_SECRET)', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expect(guard.canActivate(makeContext('Bearer org-signed-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a validly-signed token whose payload is not typ: platform', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', role: 'SUPERADMIN', organizationId: 'acme' });
    await expect(guard.canActivate(makeContext('Bearer org-token'))).rejects.toThrow(UnauthorizedException);
    expect(admins.findById).not.toHaveBeenCalled();
  });

  it('rejects when the admin account no longer exists or is inactive', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'admin-1', typ: 'platform' });
    admins.findById.mockResolvedValue(null);
    await expect(guard.canActivate(makeContext('Bearer platform-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('allows a valid platform-typed token for an active admin, and sets request.platformAdmin — never request.user', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'admin-1', typ: 'platform' });
    admins.findById.mockResolvedValue({ _id: 'admin-1', email: 'admin@platform.local', active: true });

    const ctx = makeContext('Bearer platform-token');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    const request = (ctx.switchToHttp() as any).getRequest();
    expect(request.platformAdmin).toEqual({ sub: 'admin-1', email: 'admin@platform.local' });
    expect(request.user).toBeUndefined();
  });
});
