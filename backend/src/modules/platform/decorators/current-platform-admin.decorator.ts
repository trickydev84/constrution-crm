import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedPlatformAdmin = { sub: string; email: string };

export const CurrentPlatformAdmin = createParamDecorator(
  (key: keyof AuthenticatedPlatformAdmin | undefined, ctx: ExecutionContext) => {
    const admin = ctx.switchToHttp().getRequest().platformAdmin as AuthenticatedPlatformAdmin | undefined;
    return key ? admin?.[key] : admin;
  },
);
