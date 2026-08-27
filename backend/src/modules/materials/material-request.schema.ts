import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class MaterialRequest {
  @Prop({ required: true }) projectId!: string;
  @Prop({ required: true }) materialId!: string;
  @Prop({ required: true, min: 0 }) quantity!: number;
  @Prop({ default: 'REQUESTED' }) status!: string;
  @Prop() requestedBy?: string;
  @Prop({ required: true }) organizationId!: string;
  @Prop() notes?: string;
}

export type MaterialRequestDocument = HydratedDocument<MaterialRequest>;
export const MaterialRequestSchema = SchemaFactory.createForClass(MaterialRequest);
// Matches list()'s exact filter shape: { organizationId, projectId?, status? }.
MaterialRequestSchema.index({ organizationId: 1, createdAt: -1 });
MaterialRequestSchema.index({ organizationId: 1, projectId: 1, createdAt: -1 });
MaterialRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
