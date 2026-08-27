import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class QuotationLineItem {
  @Prop({ required: true }) description!: string;
  @Prop({ required: true, enum: ['MATERIAL', 'LABOR'] }) category!: string;
  @Prop({ required: true }) quantity!: number;
  @Prop({ required: true }) unitPrice!: number;
  @Prop({ required: true }) amount!: number;
}
const QuotationLineItemSchema = SchemaFactory.createForClass(QuotationLineItem);

@Schema({ timestamps: true })
export class Quotation {
  @Prop({ required: true }) leadId!: string;
  @Prop({ type: [QuotationLineItemSchema], default: [] }) lineItems!: QuotationLineItem[];
  @Prop({ default: 0 }) taxPercent!: number;
  @Prop({ default: 0 }) discountPercent!: number;
  @Prop({ default: 0 }) subtotal!: number;
  @Prop({ default: 0 }) discountAmount!: number;
  @Prop({ default: 0 }) taxAmount!: number;
  @Prop({ default: 0 }) total!: number;
  @Prop() notes?: string;
  @Prop() terms?: string;
  @Prop({ required: true }) organizationId!: string;
}

export type QuotationDocument = HydratedDocument<Quotation>;
export const QuotationSchema = SchemaFactory.createForClass(Quotation);
QuotationSchema.index({ organizationId: 1, createdAt: -1 });
