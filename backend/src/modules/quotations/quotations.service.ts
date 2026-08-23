import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeadsService } from '../leads/leads.service';
import { Quotation, QuotationDocument } from './quotation.schema';

type LineItemInput = { description: string; category: string; quantity: number; unitPrice: number };
type QuotationInput = { leadId?: string; lineItems?: LineItemInput[]; taxPercent?: number; discountPercent?: number; notes?: string; terms?: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class QuotationsService {
  constructor(@InjectModel(Quotation.name) private model: Model<QuotationDocument>, private leads: LeadsService) {}

  list(organizationId = 'default', page = 1, limit = 20) {
    const filter = { organizationId };
    return Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.model.countDocuments(filter),
    ]).then(([data, total]) => ({ data, meta: { page, limit, total } }));
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  async create(data: QuotationInput) {
    const lead = await this.leads.findById(data.leadId!);
    if (!lead) throw new NotFoundException('Lead not found');
    const totals = this.computeTotals(data.lineItems ?? [], data.taxPercent ?? 0, data.discountPercent ?? 0);
    return this.model.create({
      leadId: data.leadId,
      lineItems: totals.lineItems,
      taxPercent: data.taxPercent ?? 0,
      discountPercent: data.discountPercent ?? 0,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
      notes: data.notes,
      terms: data.terms,
    });
  }

  async update(id: string, data: QuotationInput) {
    const existing = await this.model.findById(id).exec();
    if (!existing) return null;
    const lineItems = data.lineItems ?? existing.lineItems;
    const taxPercent = data.taxPercent ?? existing.taxPercent;
    const discountPercent = data.discountPercent ?? existing.discountPercent;
    const totals = this.computeTotals(lineItems, taxPercent, discountPercent);
    return this.model.findByIdAndUpdate(
      id,
      {
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.terms !== undefined ? { terms: data.terms } : {}),
        lineItems: totals.lineItems,
        taxPercent,
        discountPercent,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
      },
      { new: true },
    ).exec();
  }

  // Discount is applied to the subtotal first, then tax is applied to the discounted amount —
  // matches standard invoicing convention (GST charged on the post-discount price).
  private computeTotals(lineItems: LineItemInput[], taxPercent: number, discountPercent: number) {
    const items = lineItems.map((li) => ({ ...li, amount: round2(li.quantity * li.unitPrice) }));
    const subtotal = round2(items.reduce((sum, li) => sum + li.amount, 0));
    const discountAmount = round2(subtotal * (discountPercent / 100));
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = round2(taxableAmount * (taxPercent / 100));
    const total = round2(taxableAmount + taxAmount);
    return { lineItems: items, subtotal, discountAmount, taxAmount, total };
  }
}
