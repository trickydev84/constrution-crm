import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, Role } from '../../common/contracts';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission, PermissionDocument } from './permission.schema';

type PermissionAction = 'view' | 'write' | 'delete';
type SeedRow = { role: Role; resource: Resource; canView?: boolean; canWrite?: boolean; canDelete?: boolean };

// Starting matrix, editable at runtime via PATCH /api/permissions/:role/:resource — see
// .ai/BE/features/permissions.md for the rationale. SUPERADMIN rows are seeded for display accuracy
// only; PermissionsGuard bypasses SUPERADMIN entirely regardless of what's stored here.
// Every other role is deliberately absent (zero grants) — SUPERADMIN starts as the only role with any
// access, and grants everything else explicitly via PATCH /api/permissions/:role/:resource (or the FE
// permissions page) as needed. Changed 2026-08-08 at the user's explicit direction; previously ADMIN/
// SALES/PROJECT_MANAGER/SUPERVISOR/ACCOUNTANT had a starter set of grants — see .ai/BE/CHANGELOG.md.
const DEFAULT_MATRIX: SeedRow[] = [
  { role: Role.SUPERADMIN, resource: Resource.LEADS, canView: true, canWrite: true, canDelete: true },
  { role: Role.SUPERADMIN, resource: Resource.CUSTOMERS, canView: true, canWrite: true, canDelete: true },
  { role: Role.SUPERADMIN, resource: Resource.PROJECTS, canView: true, canWrite: true, canDelete: true },
  { role: Role.SUPERADMIN, resource: Resource.QUOTATIONS, canView: true, canWrite: true, canDelete: true },
  { role: Role.SUPERADMIN, resource: Resource.WORKERS, canView: true, canWrite: true, canDelete: true },
  { role: Role.SUPERADMIN, resource: Resource.MATERIALS, canView: true, canWrite: true, canDelete: true },
  { role: Role.SUPERADMIN, resource: Resource.USERS, canView: true, canWrite: true, canDelete: true },
  { role: Role.SUPERADMIN, resource: Resource.PERMISSIONS, canView: true, canWrite: true, canDelete: true },
];

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsService.name);
  constructor(@InjectModel(Permission.name) private model: Model<PermissionDocument>) {}

  async check(role: string, resource: Resource, organizationId: string, action: PermissionAction): Promise<boolean> {
    const doc = await this.model.findOne({ role, resource, organizationId }).lean().exec();
    if (!doc) return false;
    if (action === 'view') return doc.canView;
    if (action === 'write') return doc.canWrite;
    return doc.canDelete;
  }

  listMatrix(organizationId: string) {
    return this.model.find({ organizationId }).sort({ role: 1, resource: 1 }).exec();
  }

  update(role: Role, resource: Resource, organizationId: string, dto: UpdatePermissionDto) {
    return this.model.findOneAndUpdate({ role, resource, organizationId }, { $set: dto }, { new: true, upsert: true }).exec();
  }

  // Removes the row entirely rather than setting all flags false — functionally identical to check()
  // (a missing row and an all-false row both deny every action), but keeps the matrix free of leftover
  // zero-grant rows so GET /permissions reflects only real, deliberate grants.
  remove(role: Role, resource: Resource, organizationId: string) {
    return this.model.findOneAndDelete({ role, resource, organizationId }).exec();
  }

  // One row per Resource enum value, including resources with no stored grant (defaulted to all-false) —
  // lets the frontend build a complete "what can I see" picture in one call without knowing in advance
  // which resources happen to have rows. SUPERADMIN is hardcoded to fully-granted rather than read from the
  // DB, mirroring PermissionsGuard's bypass (which never queries the DB for SUPERADMIN either).
  async myPermissions(role: Role, organizationId: string) {
    if (role === Role.SUPERADMIN) {
      return Object.values(Resource).map((resource) => ({ resource, canView: true, canWrite: true, canDelete: true }));
    }
    const rows = await this.model.find({ role, organizationId }).lean().exec();
    const byResource = new Map(rows.map((row) => [row.resource, row]));
    return Object.values(Resource).map((resource) => {
      const row = byResource.get(resource);
      return { resource, canView: row?.canView ?? false, canWrite: row?.canWrite ?? false, canDelete: row?.canDelete ?? false };
    });
  }

  async onModuleInit() {
    if (process.env.SEED_PERMISSIONS === 'false') return;
    await this.seedOrganization(process.env.DEFAULT_ORGANIZATION_ID || 'default');
  }

  // Extracted from onModuleInit so a newly signed-up organization (OrganizationsService.signup())
  // gets the same starter SUPERADMIN grants as the legacy default org, not just the one seeded at
  // boot time. Idempotent, same as the boot-time seeder.
  async seedOrganization(organizationId: string) {
    let created = 0;
    for (const row of DEFAULT_MATRIX) {
      const existing = await this.model.findOne({ role: row.role, resource: row.resource, organizationId }).exec();
      if (existing) continue;
      await this.model.create({ ...row, organizationId });
      created += 1;
    }
    this.logger.log(`Permission seeder complete for '${organizationId}': ${created} row(s) created, ${DEFAULT_MATRIX.length - created} already existed.`);
  }
}
