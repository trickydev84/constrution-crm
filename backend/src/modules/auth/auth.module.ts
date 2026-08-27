import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationStatusGuard } from '../organizations/guards/organization-status.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

// Guard order matters — Nest runs global APP_GUARD providers in registration order:
//   JwtAuthGuard          attaches request.user (or 401), skips @Public() routes
//   OrganizationStatusGuard  needs request.user.organizationId; must run before PermissionsGuard —
//                          otherwise a pending org's SUPERADMIN (exactly what signup creates) would
//                          sail through PermissionsGuard's unconditional SUPERADMIN bypass
//   RolesGuard             dead/superseded infrastructure, kept as-is
//   PermissionsGuard       reads request.user, needs org-status already checked
// RolesGuard/@Roles() are kept as unused infrastructure — superseded by PermissionsGuard/@RequirePermission()
// for actual authorization; see .ai/BE/features/auth.md.
//
// JwtModule.registerAsync (not .register) is load-bearing, not stylistic: a bare .register({ secret:
// process.env.JWT_SECRET }) reads process.env at *decorator-evaluation* time — which happens when this
// file is `import`ed at the top of app.module.ts, before app.module.ts's own body runs
// ConfigModule.forRoot(). Verified live: process.env.JWT_SECRET was undefined at that point, silently
// falling back to a hardcoded secret every JWT was signed with. useFactory below runs at Nest's
// module-instantiation phase instead, after ConfigModule has loaded .env.
@Module({
  imports: [
    UsersModule,
    PermissionsModule,
    OrganizationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET must be set');
        return { secret, signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '15m') as any } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrganizationStatusGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AuthModule {}
