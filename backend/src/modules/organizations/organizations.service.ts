import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { OrganizationStatus } from '../../common/contracts';
import { PermissionsService } from '../permissions/permissions.service';
import { UsersService } from '../users/users.service';
import { CreateOrganizationSignupDto } from './dto/create-organization-signup.dto';
import { Organization, OrganizationDocument } from './organization.schema';
import { RESERVED_SLUGS, SLUG_PATTERN } from './organization.constants';

const isDuplicateKeyError = (err: unknown): boolean => (err as { code?: number })?.code === 11000;

type CachedStatus = { status: OrganizationStatus; expiresAt: number };

@Injectable()
export class OrganizationsService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationsService.name);
  // In-process TTL cache so OrganizationStatusGuard doesn't hit Mongo on every authenticated
  // request. Explicitly invalidated on every lifecycle mutation (approve/reject/suspend/reactivate)
  // so a status change is visible immediately on the instance that served it — multi-instance
  // staleness up to the TTL is a documented gap (same shape as the throttler's in-memory-storage
  // gap; same Stage-3/Redis fix would address both).
  private readonly statusCache = new Map<string, CachedStatus>();

  constructor(
    @InjectModel(Organization.name) private model: Model<OrganizationDocument>,
    private users: UsersService,
    private permissions: PermissionsService,
  ) {}

  findBySlug(slug: string) {
    return this.model.findOne({ slug }).exec();
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  list(status?: OrganizationStatus, page = 1, limit = 20, q?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q, $options: 'i' };
    return Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.model.countDocuments(filter),
    ]).then(([data, total]) => ({ data, meta: { page, limit, total } }));
  }

  async getStatusBySlug(slug: string): Promise<OrganizationStatus | null> {
    const cached = this.statusCache.get(slug);
    if (cached && cached.expiresAt > Date.now()) return cached.status;
    const org = await this.model.findOne({ slug }).select('status').lean().exec();
    if (!org) {
      this.statusCache.delete(slug);
      return null;
    }
    const ttl = Number(process.env.ORG_STATUS_CACHE_TTL_MS || 30000);
    this.statusCache.set(slug, { status: org.status, expiresAt: Date.now() + ttl });
    return org.status;
  }

  invalidate(slug: string) {
    this.statusCache.delete(slug);
  }

  async stats() {
    const rows = await this.model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec();
    const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    return {
      total,
      pending: byStatus[OrganizationStatus.PENDING] ?? 0,
      active: byStatus[OrganizationStatus.ACTIVE] ?? 0,
      suspended: byStatus[OrganizationStatus.SUSPENDED] ?? 0,
      rejected: byStatus[OrganizationStatus.REJECTED] ?? 0,
    };
  }

  async approve(id: string, approvedBy: string) {
    const org = await this.model.findById(id).exec();
    if (!org) throw new NotFoundException('Organization not found');
    if (org.status !== OrganizationStatus.PENDING) throw new BadRequestException(`Only a PENDING organization can be approved (current status: ${org.status})`);
    org.status = OrganizationStatus.ACTIVE;
    org.approvedAt = new Date();
    org.approvedBy = approvedBy;
    await org.save();
    this.invalidate(org.slug);
    return org;
  }

  async reject(id: string, reason?: string) {
    const org = await this.model.findById(id).exec();
    if (!org) throw new NotFoundException('Organization not found');
    if (org.status !== OrganizationStatus.PENDING) throw new BadRequestException(`Only a PENDING organization can be rejected (current status: ${org.status})`);
    org.status = OrganizationStatus.REJECTED;
    org.rejectedAt = new Date();
    org.rejectionReason = reason;
    await org.save();
    this.invalidate(org.slug);
    return org;
  }

  async suspend(id: string, reason?: string) {
    const org = await this.model.findById(id).exec();
    if (!org) throw new NotFoundException('Organization not found');
    if (org.status !== OrganizationStatus.ACTIVE) throw new BadRequestException(`Only an ACTIVE organization can be suspended (current status: ${org.status})`);
    org.status = OrganizationStatus.SUSPENDED;
    org.suspendedAt = new Date();
    org.suspensionReason = reason;
    await org.save();
    this.invalidate(org.slug);
    return org;
  }

  async reactivate(id: string) {
    const org = await this.model.findById(id).exec();
    if (!org) throw new NotFoundException('Organization not found');
    if (org.status !== OrganizationStatus.SUSPENDED) throw new BadRequestException(`Only a SUSPENDED organization can be reactivated (current status: ${org.status})`);
    org.status = OrganizationStatus.ACTIVE;
    await org.save();
    this.invalidate(org.slug);
    return org;
  }

  // No MongoDB transaction: docker-compose.yml runs a single-node mongo:8, and startTransaction()
  // requires a replica set — it would fail at runtime, not just be unavailable. Instead, this uses
  // the unique indexes on Organization.slug and User.email as compensating-write guards: if the
  // user create step loses an email race, the just-created organization is deleted rather than left
  // as an orphan PENDING row in the platform admin's queue.
  async signup(dto: CreateOrganizationSignupDto) {
    const slug = dto.slug.toLowerCase();
    if (!SLUG_PATTERN.test(slug)) throw new BadRequestException('slug must be lowercase letters, digits, and hyphens only');
    if (RESERVED_SLUGS.includes(slug)) throw new BadRequestException(`'${slug}' is a reserved slug`);
    if (await this.users.findByEmail(dto.adminEmail)) throw new ConflictException('Email already registered');

    const trialDays = Number(process.env.TRIAL_PERIOD_DAYS || 14);
    const now = new Date();
    let org: OrganizationDocument;
    try {
      org = await this.model.create({
        name: dto.organizationName,
        slug,
        status: OrganizationStatus.PENDING,
        contactEmail: dto.adminEmail,
        contactPhone: dto.contactPhone,
        trialStartsAt: now,
        trialEndsAt: new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000),
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new ConflictException('Organization slug already taken');
      throw err;
    }

    let user;
    try {
      user = await this.users.create(slug, {
        name: dto.adminName,
        email: dto.adminEmail,
        password: await bcrypt.hash(dto.adminPassword, 12),
        role: 'SUPERADMIN',
      });
    } catch (err) {
      // Compensate: delete the org just created rather than leave an orphan PENDING row behind.
      await this.model.deleteOne({ _id: org._id }).catch(() => undefined);
      if (isDuplicateKeyError(err)) throw new ConflictException('Email already registered');
      throw err;
    }

    org.ownerUserId = user._id.toString();
    await org.save();

    // Best-effort, not rolled back on failure — PermissionsGuard bypasses SUPERADMIN unconditionally
    // regardless, so the org is fully functional even if these rows are momentarily missing.
    await this.permissions.seedOrganization(slug).catch((err) => this.logger.warn(`Failed to seed permissions for '${slug}': ${err}`));

    return { organization: org, user };
  }

  async onModuleInit() {
    await this.seedDefaultOrganization();
  }

  // Idempotent, mirrors UsersService/PermissionsService's own onModuleInit seeders. Gives the
  // legacy single-tenant data a real Organization document — slug 'default' means every existing
  // business record (already stamped organizationId: 'default') is automatically this org's data,
  // with zero backfill.
  async seedDefaultOrganization() {
    const slug = process.env.DEFAULT_ORGANIZATION_ID || 'default';
    const existing = await this.findBySlug(slug);
    if (existing) return;
    await this.model.create({
      name: process.env.DEFAULT_ORGANIZATION_NAME || 'Default Organization',
      slug,
      status: OrganizationStatus.ACTIVE,
      contactEmail: process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@construction.local',
      trialEndsAt: null,
    });
    this.logger.log(`Default organization '${slug}' seeded.`);
  }
}
