import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; import { HydratedDocument } from 'mongoose'; import { Resource, Role } from '../../common/contracts';
@Schema({ timestamps: true }) export class Permission { @Prop({ required: true, enum: Role }) role!: Role; @Prop({ required: true, enum: Resource }) resource!: Resource; @Prop({ required: true }) organizationId!: string; @Prop({ default: false }) canView!: boolean; @Prop({ default: false }) canWrite!: boolean; @Prop({ default: false }) canDelete!: boolean; }
export type PermissionDocument = HydratedDocument<Permission>;
export const PermissionSchema = SchemaFactory.createForClass(Permission);
PermissionSchema.index({ role: 1, resource: 1, organizationId: 1 }, { unique: true });
