import { Injectable, Logger, OnModuleInit } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import * as bcrypt from 'bcrypt'; import { Model } from 'mongoose'; import { User, UserDocument } from './user.schema';

type SeedUser = { name: string; email: string; role: string; password: string };

@Injectable() export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  constructor(@InjectModel(User.name) private model: Model<UserDocument>) {}
  findByEmail(email: string) { return this.model.findOne({ email: email.toLowerCase() }).exec(); }
  create(data: Partial<User>) { return this.model.create(data); }

  async onModuleInit() {
    if (process.env.SEED_USERS === 'false') return;
    const users = this.seedUsers();
    let created = 0;
    for (const user of users) {
      const email = user.email.toLowerCase();
      const existing = await this.findByEmail(email);
      if (existing) continue;
      await this.model.create({ ...user, email, password: await bcrypt.hash(user.password, 12), organizationId: process.env.DEFAULT_ORGANIZATION_ID || 'default', active: true });
      created += 1;
    }
    this.logger.log(`User seeder complete: ${created} user(s) created, ${users.length - created} already existed.`);
  }

  private seedUsers(): SeedUser[] {
    const password = process.env.SEED_DEFAULT_PASSWORD || 'ChangeMe123!';
    return [
      { name: 'Super Administrator', email: process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@construction.local', role: 'SUPERADMIN', password: process.env.SEED_SUPERADMIN_PASSWORD || password },
      { name: 'Administrator', email: 'admin@construction.local', role: 'ADMIN', password },
      { name: 'Sales Executive', email: 'sales@construction.local', role: 'SALES', password },
      { name: 'Project Manager', email: 'project.manager@construction.local', role: 'PROJECT_MANAGER', password },
      { name: 'Site Supervisor', email: 'supervisor@construction.local', role: 'SUPERVISOR', password },
      { name: 'Accountant', email: 'accountant@construction.local', role: 'ACCOUNTANT', password },
      { name: 'Customer', email: 'customer@construction.local', role: 'CUSTOMER', password },
    ];
  }
}
