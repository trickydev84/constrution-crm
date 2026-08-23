import { Injectable } from '@nestjs/common'; import { InjectModel } from '@nestjs/mongoose'; import { Model } from 'mongoose'; import { Worker, WorkerDocument } from './worker.schema';
@Injectable() export class WorkersService {
  constructor(@InjectModel(Worker.name) private model: Model<WorkerDocument>) {}
  list(organizationId='default', page=1, limit=20) { const filter={ organizationId }; return Promise.all([this.model.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).exec(), this.model.countDocuments(filter)]).then(([data,total])=>({ data, meta:{ page, limit, total }})); }
  findById(id: string) { return this.model.findById(id).exec(); }
  create(data: Partial<Worker>) { return this.model.create(data); }
  update(id: string, data: Partial<Worker>) { return this.model.findByIdAndUpdate(id, data, { new: true }).exec(); }
  updateAvailability(id: string, availabilityStatus: string) { return this.model.findByIdAndUpdate(id, { availabilityStatus }, { new: true }).exec(); }
}
