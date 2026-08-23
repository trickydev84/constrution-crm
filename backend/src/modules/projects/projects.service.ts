import { Injectable, NotFoundException } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose'; import { CustomersService } from '../customers/customers.service'; import { Project, ProjectDocument } from './project.schema';

// DTOs validate startDate/endDate as ISO strings (@IsDateString); Mongoose casts them to Date on write.
type ProjectInput = Omit<Partial<Project>, 'startDate' | 'endDate'> & { startDate?: string | Date; endDate?: string | Date };

@Injectable() export class ProjectsService {
  constructor(@InjectModel(Project.name) private model: Model<ProjectDocument>, private customers: CustomersService) {}
  list(organizationId='default', page=1, limit=20) { const filter={ organizationId }; return Promise.all([this.model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).exec(), this.model.countDocuments(filter)]).then(([data,total])=>({ data, meta:{ page, limit, total }})); }
  findById(id: string) { return this.model.findById(id).exec(); }
  update(id: string, data: ProjectInput) { return this.model.findByIdAndUpdate(id, data, { new: true }).exec(); }
  updateStage(id: string, stage: string) { return this.model.findByIdAndUpdate(id, { stage }, { new: true }).exec(); }

  async create(data: ProjectInput) {
    const customer = await this.customers.findById(data.customerId!);
    if (!customer) throw new NotFoundException('Customer not found');
    return this.model.create(data);
  }
}
