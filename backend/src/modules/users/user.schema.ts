import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; import { HydratedDocument } from 'mongoose';
@Schema({ timestamps: true }) export class User { @Prop({ required: true }) name!: string; @Prop({ required: true, unique: true, lowercase: true }) email!: string; @Prop({ required: true }) password!: string; @Prop({ required: true, default: 'CUSTOMER' }) role!: string; @Prop({ required: true }) organizationId!: string; @Prop({ default: true }) active!: boolean; }
export type UserDocument = HydratedDocument<User>; export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ organizationId: 1, createdAt: -1 });
UserSchema.index({ organizationId: 1, role: 1, createdAt: -1 });
