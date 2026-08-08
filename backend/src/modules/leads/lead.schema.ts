import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true }) export class Lead { @Prop({ required: true }) name!: string; @Prop({ required: true }) phone!: string; @Prop() email?: string; @Prop() source?: string; @Prop({ default: 'NEW' }) status!: string; @Prop({ default: 'default' }) organizationId!: string; @Prop() notes?: string; }
export type LeadDocument = HydratedDocument<Lead>; export const LeadSchema = SchemaFactory.createForClass(Lead);
