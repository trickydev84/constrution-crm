import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Material {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) category!: string;
  @Prop({ required: true }) unit!: string;
  @Prop({ required: true, default: 0, min: 0 }) unitPrice!: number;
  @Prop({ required: true, default: 0, min: 0 }) stockQuantity!: number;
  @Prop({ default: 0, min: 0 }) reorderLevel!: number;
  @Prop({ required: true }) organizationId!: string;
  @Prop() notes?: string;
}

export type MaterialDocument = HydratedDocument<Material>;
export const MaterialSchema = SchemaFactory.createForClass(Material);
MaterialSchema.index({ organizationId: 1, createdAt: -1 });
// Serves lowStock()'s sort({name:1}) — the $expr stock<=reorderLevel compare itself can't be
// index-served (field-to-field comparison), but this avoids an in-memory sort of the matched set.
MaterialSchema.index({ organizationId: 1, name: 1 });
