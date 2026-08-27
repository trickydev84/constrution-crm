import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MaterialsService } from './materials.service';
import { MaterialRequest, MaterialRequestDocument } from './material-request.schema';

@Injectable()
export class MaterialRequestsService {
  constructor(
    @InjectModel(MaterialRequest.name) private model: Model<MaterialRequestDocument>,
    private materials: MaterialsService,
  ) {}

  list(organizationId: string, page = 1, limit = 20, filter: { projectId?: string; status?: string } = {}) {
    const query = { organizationId, ...filter };
    return Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.model.countDocuments(query),
    ]).then(([data, total]) => ({ data, meta: { page, limit, total } }));
  }

  findById(organizationId: string, id: string) {
    return this.model.findOne({ _id: id, organizationId }).exec();
  }

  async create(organizationId: string, data: Partial<MaterialRequest>) {
    const material = await this.materials.findById(organizationId, data.materialId!);
    if (!material) throw new NotFoundException('Material not found');
    return this.model.create({ ...data, organizationId, status: 'REQUESTED' });
  }

  async approve(organizationId: string, id: string) {
    const request = await this.findById(organizationId, id);
    if (!request) throw new NotFoundException('Material request not found');
    if (request.status !== 'REQUESTED') throw new BadRequestException(`Only a REQUESTED request can be approved (current status: ${request.status})`);
    return this.model.findOneAndUpdate({ _id: id, organizationId }, { status: 'APPROVED' }, { new: true }).exec();
  }

  async reject(organizationId: string, id: string) {
    const request = await this.findById(organizationId, id);
    if (!request) throw new NotFoundException('Material request not found');
    if (request.status === 'FULFILLED' || request.status === 'REJECTED') {
      throw new BadRequestException(`Cannot reject a request that is already ${request.status}`);
    }
    return this.model.findOneAndUpdate({ _id: id, organizationId }, { status: 'REJECTED' }, { new: true }).exec();
  }

  async fulfill(organizationId: string, id: string) {
    const request = await this.findById(organizationId, id);
    if (!request) throw new NotFoundException('Material request not found');
    if (request.status !== 'APPROVED') throw new BadRequestException(`Only an APPROVED request can be fulfilled (current status: ${request.status})`);
    const decremented = await this.materials.decrementStock(organizationId, request.materialId, request.quantity);
    if (!decremented) throw new BadRequestException('Insufficient stock to fulfill this request');
    return this.model.findOneAndUpdate({ _id: id, organizationId }, { status: 'FULFILLED' }, { new: true }).exec();
  }
}
