import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from './material.schema';

@Injectable()
export class MaterialsService {
  constructor(@InjectModel(Material.name) private model: Model<MaterialDocument>) {}

  list(organizationId: string, page = 1, limit = 20) {
    const filter = { organizationId };
    return Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.model.countDocuments(filter),
    ]).then(([data, total]) => ({ data, meta: { page, limit, total } }));
  }

  // Not paginated, like GET /permissions — this is a bounded "current alerts" view, not a growing list.
  lowStock(organizationId: string) {
    return this.model.find({ organizationId, $expr: { $lte: ['$stockQuantity', '$reorderLevel'] } }).sort({ name: 1 }).exec();
  }

  findById(organizationId: string, id: string) {
    return this.model.findOne({ _id: id, organizationId }).exec();
  }

  create(organizationId: string, data: Partial<Material>) {
    return this.model.create({ ...data, organizationId });
  }

  update(organizationId: string, id: string, data: Partial<Material>) {
    return this.model.findOneAndUpdate({ _id: id, organizationId }, data, { new: true }).exec();
  }

  // Atomic conditional decrement (not read-then-write) — the $gte filter means concurrent fulfillments
  // can't both pass a stale in-memory stock check and drive stockQuantity negative. Returns null if the
  // material doesn't exist (or belongs to another org) or current stock is below the requested
  // quantity; the caller distinguishes those cases itself (it already fetched the material to
  // validate the request).
  decrementStock(organizationId: string, id: string, quantity: number) {
    return this.model.findOneAndUpdate({ _id: id, organizationId, stockQuantity: { $gte: quantity } }, { $inc: { stockQuantity: -quantity } }, { new: true }).exec();
  }
}
