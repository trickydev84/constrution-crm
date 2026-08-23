import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true }) export class Customer { @Prop({ required: true }) name!: string; @Prop({ required: true }) phone!: string; @Prop() email?: string; @Prop() address?: string; @Prop() leadId?: string; @Prop({ default: 'default' }) organizationId!: string; @Prop() notes?: string; }
export type CustomerDocument = HydratedDocument<Customer>; export const CustomerSchema = SchemaFactory.createForClass(Customer);
