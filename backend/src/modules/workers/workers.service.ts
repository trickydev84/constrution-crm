import { Injectable } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose'; import { Worker, WorkerDocument } from './worker.schema';
@Injectable() export class WorkersService {
  constructor(@InjectModel(Worker.name) private model: Model<WorkerDocument>) {}
  list(organizationId: string, page=1, limit=20) { const filter={ organizationId }; return Promise.all([this.model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).exec(), this.model.countDocuments(filter)]).then(([data,total])=>({ data, meta:{ page, limit, total }})); }
  findById(organizationId: string, id: string) { return this.model.findOne({ _id: id, organizationId }).exec(); }
  create(organizationId: string, data: Partial<Worker>) { return this.model.create({ ...data, organizationId }); }
  update(organizationId: string, id: string, data: Partial<Worker>) { return this.model.findOneAndUpdate({ _id: id, organizationId }, data, { new: true }).exec(); }
  updateAvailability(organizationId: string, id: string, availabilityStatus: string) { return this.model.findOneAndUpdate({ _id: id, organizationId }, { availabilityStatus }, { new: true }).exec(); }
}
