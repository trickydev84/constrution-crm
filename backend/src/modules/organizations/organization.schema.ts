import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OrganizationStatus } from '../../common/contracts';

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true }) name!: string;

  // Immutable after creation — no rename endpoint exists in Stage 1. This value is stored verbatim
  // as `organizationId` on every business document (leads, customers, projects, ...), and is also
  // the Stage 3 subdomain label (acme.yourcrm.com) with no extra mapping table needed.
  @Prop({ required: true, unique: true, lowercase: true }) slug!: string;

  @Prop({ required: true, enum: OrganizationStatus, default: OrganizationStatus.PENDING }) status!: OrganizationStatus;

  @Prop({ required: true, lowercase: true }) contactEmail!: string;
  @Prop() contactPhone?: string;

  // The User._id of the org's first SUPERADMIN, set right after that user is created during signup.
  @Prop() ownerUserId?: string;

  @Prop() trialStartsAt?: Date;
  // null = no trial limit (the legacy 'default' org). Undefined vs. explicit null both read as "no
  // limit" by Stage 2's future enforcement — Stage 1 never checks this field.
  @Prop({ type: Date, default: null }) trialEndsAt?: Date | null;

  @Prop() approvedAt?: Date;
  @Prop() approvedBy?: string;
  @Prop() rejectedAt?: Date;
  @Prop() rejectionReason?: string;
  @Prop() suspendedAt?: Date;
  @Prop() suspensionReason?: string;
}

export type OrganizationDocument = HydratedDocument<Organization>;
export const OrganizationSchema = SchemaFactory.createForClass(Organization);
// slug's unique index comes from @Prop({ unique: true }) above, matching User.email's convention.
OrganizationSchema.index({ status: 1, createdAt: -1 });
