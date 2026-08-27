import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PlatformAdminsService } from './platform-admins.service';

@Injectable()
export class PlatformAuthService {
  // JwtService here resolves to PlatformModule's own JwtModule.registerAsync (PLATFORM_JWT_SECRET),
  // not AuthModule's — PlatformModule never imports AuthModule, so there's no ambiguity within
  // Nest's module-scoped DI.
  constructor(private admins: PlatformAdminsService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const admin = await this.admins.findByEmail(email);
    if (!admin || !admin.active || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      accessToken: this.jwt.sign({ sub: admin._id.toString(), email: admin.email, typ: 'platform' }),
      admin: { id: admin._id, name: admin.name, email: admin.email },
    };
  }
}
