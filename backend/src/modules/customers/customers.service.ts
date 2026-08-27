import { Injectable } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose'; import { Customer, CustomerDocument } from './customer.schema';
@Injectable() export class CustomersService {
  constructor(@InjectModel(Customer.name) private model: Model<CustomerDocument>) {}
  list(organizationId: string, page=1, limit=20) { const filter={ organizationId }; return Promise.all([this.model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).exec(), this.model.countDocuments(filter)]).then(([data,total])=>({ data, meta:{ page, limit, total }})); }
  findById(organizationId: string, id: string) { return this.model.findOne({ _id: id, organizationId }).exec(); }
  findByLeadId(organizationId: string, leadId: string) { return this.model.findOne({ organizationId, leadId }).exec(); }
  create(organizationId: string, data: Partial<Customer>) { return this.model.create({ ...data, organizationId }); }
  update(organizationId: string, id: string, data: Partial<Customer>) { return this.model.findOneAndUpdate({ _id: id, organizationId }, data, { new: true }).exec(); }
}
