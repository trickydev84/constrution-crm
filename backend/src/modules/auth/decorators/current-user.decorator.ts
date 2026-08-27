import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../../../common/contracts';

export type AuthenticatedUser = { sub: string; email: string; role: Role; organizationId: string };

// Custom param decorators are invisible to the Swagger generator, so @CurrentUser() on a handler
// produces zero OpenAPI churn — no @ApiQuery/@ApiParam needed alongside it.
export const CurrentUser = createParamDecorator((key: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest().user as AuthenticatedUser | undefined;
  return key ? user?.[key] : user;
});
