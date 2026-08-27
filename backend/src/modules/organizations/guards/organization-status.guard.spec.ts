import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationStatusGuard } from './organization-status.guard';
import { OrganizationsService } from '../organizations.service';
import { OrganizationStatus } from '../../../common/contracts';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { ALLOW_INACTIVE_ORGANIZATION_KEY } from '../decorators/allow-inactive-organization.decorator';

function makeContext(user: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('OrganizationStatusGuard', () => {
  let guard: OrganizationStatusGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let organizations: { getStatusBySlug: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    organizations = { getStatusBySlug: jest.fn() };
    guard = new OrganizationStatusGuard(reflector as unknown as Reflector, organizations as unknown as OrganizationsService);
  });

  function mockMetadata({ isPublic = false, allowInactive = false } = {}) {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ALLOW_INACTIVE_ORGANIZATION_KEY) return allowInactive;
      return undefined;
    });
  }

  it('allows @Public() routes without checking org status', async () => {
    mockMetadata({ isPublic: true });
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
    expect(organizations.getStatusBySlug).not.toHaveBeenCalled();
  });

  it('allows @AllowInactiveOrganization() routes without checking org status', async () => {
    mockMetadata({ allowInactive: true });
    await expect(guard.canActivate(makeContext({ organizationId: 'acme' }))).resolves.toBe(true);
    expect(organizations.getStatusBySlug).not.toHaveBeenCalled();
  });

  it('allows an ACTIVE organization', async () => {
    mockMetadata();
    organizations.getStatusBySlug.mockResolvedValue(OrganizationStatus.ACTIVE);
    await expect(guard.canActivate(makeContext({ organizationId: 'acme' }))).resolves.toBe(true);
  });

  it.each([
    [OrganizationStatus.PENDING, 'ORGANIZATION_PENDING'],
    [OrganizationStatus.SUSPENDED, 'ORGANIZATION_SUSPENDED'],
    [OrganizationStatus.REJECTED, 'ORGANIZATION_REJECTED'],
  ])('rejects a %s organization with code %s', async (status, code) => {
    mockMetadata();
    organizations.getStatusBySlug.mockResolvedValue(status);
    try {
      await guard.canActivate(makeContext({ organizationId: 'acme' }));
      fail('expected ForbiddenException');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({ code });
    }
  });

  it('rejects with ORGANIZATION_NOT_FOUND when the organization no longer exists', async () => {
    mockMetadata();
    organizations.getStatusBySlug.mockResolvedValue(null);
    try {
      await guard.canActivate(makeContext({ organizationId: 'ghost' }));
      fail('expected ForbiddenException');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({ code: 'ORGANIZATION_NOT_FOUND' });
    }
  });

  it('rejects when request.user is missing on a gated route', async () => {
    mockMetadata();
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(ForbiddenException);
    expect(organizations.getStatusBySlug).not.toHaveBeenCalled();
  });
});
