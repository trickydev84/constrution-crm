import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { HealthModule } from './modules/health/health.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { UsersModule } from './modules/users/users.module';
import { WorkersModule } from './modules/workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction_crm', {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 100),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
      autoIndex: process.env.MONGO_AUTO_INDEX !== 'false',
    }),
    // IP-based (no dependency on request.user), so its APP_GUARD registration position relative to
    // JwtAuthGuard/PermissionsGuard (see auth.module.ts) doesn't matter, unlike those two.
    ThrottlerModule.forRoot([{ ttl: Number(process.env.THROTTLE_TTL_MS || 60000), limit: Number(process.env.THROTTLE_LIMIT || 300) }]),
    HealthModule,
    OrganizationsModule,
    PlatformModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    CustomersModule,
    ProjectsModule,
    QuotationsModule,
    WorkersModule,
    MaterialsModule,
    PermissionsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
