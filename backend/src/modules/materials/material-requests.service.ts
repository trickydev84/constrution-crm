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

  list(organizationId = 'default', page = 1, limit = 20, filter: { projectId?: string; status?: string } = {}) {
    const query = { organizationId, ...filter };
    return Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.model.countDocuments(query),
    ]).then(([data, total]) => ({ data, meta: { page, limit, total } }));
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  async create(data: Partial<MaterialRequest>) {
    const material = await this.materials.findById(data.materialId!);
    if (!material) throw new NotFoundException('Material not found');
    return this.model.create({ ...data, status: 'REQUESTED' });
  }

  async approve(id: string) {
    const request = await this.findById(id);
    if (!request) throw new NotFoundException('Material request not found');
    if (request.status !== 'REQUESTED') throw new BadRequestException(`Only a REQUESTED request can be approved (current status: ${request.status})`);
    return this.model.findByIdAndUpdate(id, { status: 'APPROVED' }, { new: true }).exec();
  }

  async reject(id: string) {
    const request = await this.findById(id);
    if (!request) throw new NotFoundException('Material request not found');
    if (request.status === 'FULFILLED' || request.status === 'REJECTED') {
      throw new BadRequestException(`Cannot reject a request that is already ${request.status}`);
    }
    return this.model.findByIdAndUpdate(id, { status: 'REJECTED' }, { new: true }).exec();
  }

  async fulfill(id: string) {
    const request = await this.findById(id);
    if (!request) throw new NotFoundException('Material request not found');
    if (request.status !== 'APPROVED') throw new BadRequestException(`Only an APPROVED request can be fulfilled (current status: ${request.status})`);
    const decremented = await this.materials.decrementStock(request.materialId, request.quantity);
    if (!decremented) throw new BadRequestException('Insufficient stock to fulfill this request');
    return this.model.findByIdAndUpdate(id, { status: 'FULFILLED' }, { new: true }).exec();
  }
}
