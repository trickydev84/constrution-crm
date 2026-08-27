import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true }) export class Project { @Prop({ required: true }) name!: string; @Prop({ required: true }) customerId!: string; @Prop({ default: 'PLANNING' }) stage!: string; @Prop() projectManagerId?: string; @Prop() supervisorId?: string; @Prop() budget?: number; @Prop() startDate?: Date; @Prop() endDate?: Date; @Prop({ min: 0, max: 100 }) progressPercent?: number; @Prop({ required: true }) organizationId!: string; @Prop() notes?: string; }
export type ProjectDocument = HydratedDocument<Project>; export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ organizationId: 1, createdAt: -1 });
