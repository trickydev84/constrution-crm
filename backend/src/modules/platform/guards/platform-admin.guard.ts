import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlatformAdminsService } from '../platform-admins.service';

// Verifies with PlatformModule's own JwtService (PLATFORM_JWT_SECRET) — an org token, signed with
// the completely different JWT_SECRET, fails verifyAsync cryptographically here, not via a field
// check. Sets request.platformAdmin, and deliberately never request.user, so no downstream code
// (e.g. anything expecting request.user.organizationId) can pick up a false org context from a
// platform request.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private jwt: JwtService, private admins: PlatformAdminsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Missing access token');

    let payload: { sub: string; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (payload.typ !== 'platform') throw new UnauthorizedException('Invalid or expired access token');

    const admin = await this.admins.findById(payload.sub);
    if (!admin || !admin.active) throw new UnauthorizedException('Invalid or expired access token');

    request.platformAdmin = { sub: admin._id.toString(), email: admin.email };
    return true;
  }
}
