import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose'; import { CustomersService } from '../customers/customers.service'; import { Lead, LeadDocument } from './lead.schema';
@Injectable() export class LeadsService {
  constructor(@InjectModel(Lead.name) private model: Model<LeadDocument>, private customers: CustomersService) {}
  list(organizationId='default', page=1, limit=20) { const filter={ organizationId }; return Promise.all([this.model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).exec(), this.model.countDocuments(filter)]).then(([data,total])=>({ data, meta:{ page, limit, total }})); }
  findById(id: string) { return this.model.findById(id).exec(); }
  create(data: Partial<Lead>) { return this.model.create(data); }
  updateStatus(id: string, status: string) { return this.model.findByIdAndUpdate(id, { status }, { new:true }).exec(); }

  async convertToCustomer(id: string) {
    const lead = await this.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status !== 'WON') throw new BadRequestException('Only a WON lead can be converted to a customer');
    if (await this.customers.findByLeadId(lead._id.toString())) throw new ConflictException('Lead already converted to a customer');
    return this.customers.create({ name: lead.name, phone: lead.phone, email: lead.email, leadId: lead._id.toString(), organizationId: lead.organizationId, notes: lead.notes });
  }
}
