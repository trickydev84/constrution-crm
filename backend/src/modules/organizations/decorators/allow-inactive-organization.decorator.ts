import { SetMetadata } from '@nestjs/common';
export const ALLOW_INACTIVE_ORGANIZATION_KEY = 'allowInactiveOrganization';
// Exempts a route from OrganizationStatusGuard while still requiring a valid JWT — used only by
// GET /organizations/me, so a pending/suspended org's users can discover their own status.
export const AllowInactiveOrganization = () => SetMetadata(ALLOW_INACTIVE_ORGANIZATION_KEY, true);
