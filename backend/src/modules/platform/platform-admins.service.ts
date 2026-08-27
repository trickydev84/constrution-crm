import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { PlatformAdmin, PlatformAdminDocument } from './platform-admin.schema';

@Injectable()
export class PlatformAdminsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformAdminsService.name);
  constructor(@InjectModel(PlatformAdmin.name) private model: Model<PlatformAdminDocument>) {}

  findByEmail(email: string) {
    return this.model.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  // Mirrors UsersService's/PermissionsService's own idempotent onModuleInit seeders — one platform
  // admin account, bootstrapped from env, skippable via SEED_PLATFORM_ADMIN=false.
  async onModuleInit() {
    if (process.env.SEED_PLATFORM_ADMIN === 'false') return;
    const email = (process.env.PLATFORM_ADMIN_EMAIL || 'platform-admin@construction.local').toLowerCase();
    if (await this.findByEmail(email)) return;
    await this.model.create({
      name: process.env.PLATFORM_ADMIN_NAME || 'Platform Administrator',
      email,
      password: await bcrypt.hash(process.env.PLATFORM_ADMIN_PASSWORD || 'ChangeMe123!', 12),
      active: true,
    });
    this.logger.log(`Platform admin '${email}' seeded.`);
  }
}
