import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Lead, LeadSchema } from '../leads/lead.schema';
import { MaterialRequest, MaterialRequestSchema } from '../materials/material-request.schema';
import { Material, MaterialSchema } from '../materials/material.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { Project, ProjectSchema } from '../projects/project.schema';
import { Quotation, QuotationSchema } from '../quotations/quotation.schema';
import { User, UserSchema } from '../users/user.schema';
import { Worker, WorkerSchema } from '../workers/worker.schema';
import { PlatformAdmin, PlatformAdminSchema } from './platform-admin.schema';
import { PlatformAdminsService } from './platform-admins.service';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { OrganizationUsageService } from './organization-usage.service';
import { PlatformOrganizationsController } from './platform-organizations.controller';
import { PlatformOrganizationsService } from './platform-organizations.service';

// Imports OrganizationsModule (org lifecycle is exactly the master-admin's job) and direct
// MongooseModule.forFeature bindings for the 8 business schemas (for OrganizationUsageService's
// countDocuments()-only aggregation) — deliberately NOT LeadsModule/CustomersModule/etc. (which
// would bring in their full services/controllers) and NOT AuthModule/UsersModule's controllers.
// The org JWT secret remains completely unreachable from this module's graph: AuthModule is never
// imported, directly or transitively, so there is no path from here to mint or verify an org token.
// See .ai/BE/features/platform-admin.md.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformAdmin.name, schema: PlatformAdminSchema },
      { name: User.name, schema: UserSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Quotation.name, schema: QuotationSchema },
      { name: Worker.name, schema: WorkerSchema },
      { name: Material.name, schema: MaterialSchema },
      { name: MaterialRequest.name, schema: MaterialRequestSchema },
    ]),
    OrganizationsModule,
    // Separate JwtModule instance, separate secret — registerAsync for the same load-bearing
    // reason as auth.module.ts's: a bare .register() reads process.env at decorator-evaluation
    // time, before ConfigModule.forRoot() has run.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('PLATFORM_JWT_SECRET');
        if (!secret) throw new Error('PLATFORM_JWT_SECRET must be set');
        return { secret, signOptions: { expiresIn: (config.get<string>('PLATFORM_JWT_EXPIRES_IN') || '30m') as any } };
      },
    }),
  ],
  controllers: [PlatformAuthController, PlatformOrganizationsController],
  providers: [PlatformAdminsService, PlatformAuthService, PlatformAdminGuard, OrganizationUsageService, PlatformOrganizationsService],
})
export class PlatformModule {}
