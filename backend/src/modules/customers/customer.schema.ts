import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true }) export class Customer { @Prop({ required: true }) name!: string; @Prop({ required: true }) phone!: string; @Prop() email?: string; @Prop() address?: string; @Prop() leadId?: string; @Prop({ required: true }) organizationId!: string; @Prop() notes?: string; }
export type CustomerDocument = HydratedDocument<Customer>; export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ organizationId: 1, createdAt: -1 });
// Sparse, not unique: a leadId is only present on converted customers. Not unique because the
// lead-conversion race-loser should surface as LeadsService's clean 409 ConflictException, not a raw
// E11000 driver error.
CustomerSchema.index({ leadId: 1 }, { sparse: true });
