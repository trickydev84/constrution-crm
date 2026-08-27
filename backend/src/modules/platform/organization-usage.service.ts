import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import { Lead, LeadDocument } from '../leads/lead.schema';
import { MaterialRequest, MaterialRequestDocument } from '../materials/material-request.schema';
import { Material, MaterialDocument } from '../materials/material.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { Quotation, QuotationDocument } from '../quotations/quotation.schema';
import { User, UserDocument } from '../users/user.schema';
import { Worker, WorkerDocument } from '../workers/worker.schema';

// Counts-only, by design: every method here returns a number or a timestamp, never a document.
// This is the enforcement point for "master-admin sees usage analytics, never business records" —
// if any method under modules/platform/ ever returns something other than a count/date, that
// guarantee is broken. Only Mongoose Models are injected here (via MongooseModule.forFeature in
// platform.module.ts), not the business modules' services — there is no path from this class to a
// full Lead/Customer/... document.
@Injectable()
export class OrganizationUsageService {
  constructor(
    @InjectModel(User.name) private users: Model<UserDocument>,
    @InjectModel(Lead.name) private leads: Model<LeadDocument>,
    @InjectModel(Customer.name) private customers: Model<CustomerDocument>,
    @InjectModel(Project.name) private projects: Model<ProjectDocument>,
    @InjectModel(Quotation.name) private quotations: Model<QuotationDocument>,
    @InjectModel(Worker.name) private workers: Model<WorkerDocument>,
    @InjectModel(Material.name) private materials: Model<MaterialDocument>,
    @InjectModel(MaterialRequest.name) private materialRequests: Model<MaterialRequestDocument>,
  ) {}

  async getUsage(organizationId: string) {
    const collections: [string, Model<any>][] = [
      ['users', this.users],
      ['leads', this.leads],
      ['customers', this.customers],
      ['projects', this.projects],
      ['quotations', this.quotations],
      ['workers', this.workers],
      ['materials', this.materials],
      ['materialRequests', this.materialRequests],
    ];

    const [counts, latestDates] = await Promise.all([
      Promise.all(collections.map(([, model]) => model.countDocuments({ organizationId }))),
      Promise.all(collections.map(([, model]) =>
        model.findOne({ organizationId }).sort({ createdAt: -1 }).select('createdAt').lean().exec(),
      )),
    ]);

    const result: Record<string, number> = {};
    collections.forEach(([key], i) => { result[key] = counts[i]; });

    const lastActivityAt = latestDates
      .map((doc: any) => doc?.createdAt as Date | undefined)
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return { organizationId, ...result, lastActivityAt };
  }
}
