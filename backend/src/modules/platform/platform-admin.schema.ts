import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Deliberately its own collection, not a User with organizationId: null — see
// .ai/BE/features/platform-admin.md for why reusing User/Role was rejected (the PATCH
// /permissions/:role/:resource write path would let a null-org admin write a real, honored grant
// row). Platform routes never touch Role/Resource/Permission at all.
@Schema({ timestamps: true })
export class PlatformAdmin {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, unique: true, lowercase: true }) email!: string;
  @Prop({ required: true }) password!: string;
  @Prop({ default: true }) active!: boolean;
}

export type PlatformAdminDocument = HydratedDocument<PlatformAdmin>;
export const PlatformAdminSchema = SchemaFactory.createForClass(PlatformAdmin);
