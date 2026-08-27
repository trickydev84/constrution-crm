import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { Quotation } from './quotation.schema';
import { LeadsService } from '../leads/leads.service';

describe('QuotationsService.create — line-item totals', () => {
  let service: QuotationsService;
  let modelCreate: jest.Mock;
  let leadsFindById: jest.Mock;

  beforeEach(async () => {
    modelCreate = jest.fn((doc) => Promise.resolve(doc));
    leadsFindById = jest.fn().mockResolvedValue({ _id: 'lead-1' });

    const module = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: getModelToken(Quotation.name), useValue: { create: modelCreate, find: jest.fn(), countDocuments: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn() } },
        { provide: LeadsService, useValue: { findById: leadsFindById } },
      ],
    }).compile();

    service = module.get(QuotationsService);
  });

  it('throws NotFoundException when the lead does not exist', async () => {
    leadsFindById.mockResolvedValueOnce(null);
    await expect(service.create('acme', { leadId: 'missing', lineItems: [] })).rejects.toThrow(NotFoundException);
  });

  it('computes per-line amounts and applies discount before tax', async () => {
    // ₹48,000 subtotal, 5% discount, 18% tax — hand-verified live earlier in this project against
    // exactly this scenario: 48000 -> 45600 (post-discount) -> 53808 (post-tax).
    await service.create('acme', {
      leadId: 'lead-1',
      lineItems: [
        { description: 'Cement', category: 'MATERIAL', quantity: 100, unitPrice: 400 },
        { description: 'Labor', category: 'LABOR', quantity: 8, unitPrice: 1000 },
      ],
      taxPercent: 18,
      discountPercent: 5,
    });

    expect(modelCreate).toHaveBeenCalledTimes(1);
    const doc = modelCreate.mock.calls[0][0];
    expect(doc.organizationId).toBe('acme');
    expect(doc.lineItems[0].amount).toBe(40000);
    expect(doc.lineItems[1].amount).toBe(8000);
    expect(doc.subtotal).toBe(48000);
    expect(doc.discountAmount).toBe(2400);
    // Tax must be computed on the post-discount amount, not the raw subtotal.
    expect(doc.taxAmount).toBe(Math.round((48000 - 2400) * 0.18 * 100) / 100);
    expect(doc.taxAmount).toBe(8208);
    expect(doc.total).toBe(53808);
  });

  it('rounds to 2 decimal places on a value that needs it', async () => {
    await service.create('acme', {
      leadId: 'lead-1',
      lineItems: [{ description: 'Odd unit price', category: 'MATERIAL', quantity: 3, unitPrice: 33.335 }],
      taxPercent: 0,
      discountPercent: 0,
    });

    const doc = modelCreate.mock.calls[0][0];
    expect(doc.lineItems[0].amount).toBe(Math.round(3 * 33.335 * 100) / 100);
    expect(Number.isInteger(doc.subtotal * 100)).toBe(true);
  });

  it('defaults tax/discount to 0 when omitted', async () => {
    await service.create('acme', { leadId: 'lead-1', lineItems: [{ description: 'X', category: 'MATERIAL', quantity: 1, unitPrice: 100 }] });
    const doc = modelCreate.mock.calls[0][0];
    expect(doc.taxPercent).toBe(0);
    expect(doc.discountPercent).toBe(0);
    expect(doc.taxAmount).toBe(0);
    expect(doc.discountAmount).toBe(0);
    expect(doc.total).toBe(100);
  });
});
