import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '../../../common/contracts';

export class OrganizationResponseDto {
  @ApiProperty({ example: '6a76f3f371b2754dd847857d' })
  _id!: string;

  @ApiProperty({ example: 'Acme Builders Pvt Ltd' })
  name!: string;

  @ApiProperty({ example: 'acme-builders' })
  slug!: string;

  @ApiProperty({ enum: OrganizationStatus, example: OrganizationStatus.PENDING })
  status!: OrganizationStatus;

  @ApiProperty({ example: 'ramesh@acmebuilders.com' })
  contactEmail!: string;

  @ApiPropertyOptional({ example: '9998887777' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: '6a76f3f371b2754dd8478577' })
  ownerUserId?: string;

  @ApiPropertyOptional()
  trialStartsAt?: string;

  @ApiPropertyOptional({ description: 'null means no trial limit (e.g. the legacy default organization).' })
  trialEndsAt?: string | null;

  @ApiPropertyOptional()
  approvedAt?: string;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  rejectedAt?: string;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  suspendedAt?: string;

  @ApiPropertyOptional()
  suspensionReason?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
