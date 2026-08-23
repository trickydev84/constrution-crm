import { Injectable } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose'; import { Customer, CustomerDocument } from './customer.schema';
@Injectable() export class CustomersService {
  constructor(@InjectModel(Customer.name) private model: Model<CustomerDocument>) {}
  list(organizationId='default', page=1, limit=20) { const filter={ organizationId }; return Promise.all([this.model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).exec(), this.model.countDocuments(filter)]).then(([data,total])=>({ data, meta:{ page, limit, total }})); }
  findById(id: string) { return this.model.findById(id).exec(); }
  findByLeadId(leadId: string) { return this.model.findOne({ leadId }).exec(); }
  create(data: Partial<Customer>) { return this.model.create(data); }
  update(id: string, data: Partial<Customer>) { return this.model.findByIdAndUpdate(id, data, { new: true }).exec(); }
}
