import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

// @Public() here is not a mistake — it steps the global JwtAuthGuard (which expects an org token)
// aside so PlatformAdminGuard, a controller-scoped guard, can run instead. Nest evaluates global
// guards before controller-scoped ones, so PlatformAdminGuard still runs and still requires a valid
// (platform-secret-signed) bearer token — this route is authenticated, just not by JwtAuthGuard.
export const PlatformAdminOnly = () => applyDecorators(Public(), UseGuards(PlatformAdminGuard), ApiBearerAuth());
