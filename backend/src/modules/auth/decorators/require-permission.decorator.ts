import { SetMetadata } from '@nestjs/common'; import { Resource } from '../../../common/contracts';
export const PERMISSION_KEY = 'permission';
export type PermissionAction = 'view' | 'write' | 'delete';
export const RequirePermission = (resource: Resource, action: PermissionAction) => SetMetadata(PERMISSION_KEY, { resource, action });
