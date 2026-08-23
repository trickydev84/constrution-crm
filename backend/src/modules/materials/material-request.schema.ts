import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class MaterialRequest {
  @Prop({ required: true }) projectId!: string;
  @Prop({ required: true }) materialId!: string;
  @Prop({ required: true, min: 0 }) quantity!: number;
  @Prop({ default: 'REQUESTED' }) status!: string;
  @Prop() requestedBy?: string;
  @Prop({ default: 'default' }) organizationId!: string;
  @Prop() notes?: string;
}

export type MaterialRequestDocument = HydratedDocument<MaterialRequest>;
export const MaterialRequestSchema = SchemaFactory.createForClass(MaterialRequest);
