import { Injectable } from '@nestjs/common';
import { OrganizationStatus } from '../../common/contracts';
import { OrganizationsService } from '../organizations/organizations.service';
import { OrganizationUsageService } from './organization-usage.service';

@Injectable()
export class PlatformOrganizationsService {
  constructor(private organizations: OrganizationsService, private usage: OrganizationUsageService) {}

  list(status?: OrganizationStatus, page = 1, limit = 20, q?: string) {
    return this.organizations.list(status, page, limit, q);
  }

  findById(id: string) {
    return this.organizations.findById(id);
  }

  approve(id: string, approvedBy: string) {
    return this.organizations.approve(id, approvedBy);
  }

  reject(id: string, reason?: string) {
    return this.organizations.reject(id, reason);
  }

  suspend(id: string, reason?: string) {
    return this.organizations.suspend(id, reason);
  }

  reactivate(id: string) {
    return this.organizations.reactivate(id);
  }

  stats() {
    return this.organizations.stats();
  }

  async usageFor(id: string) {
    const org = await this.organizations.findById(id);
    if (!org) return null;
    return this.usage.getUsage(org.slug);
  }
}
