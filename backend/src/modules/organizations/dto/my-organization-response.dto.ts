import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '../../../common/contracts';

export class MyOrganizationResponseDto {
  @ApiProperty({ example: 'Acme Builders Pvt Ltd' })
  name!: string;

  @ApiProperty({ example: 'acme-builders' })
  slug!: string;

  @ApiProperty({ enum: OrganizationStatus, example: OrganizationStatus.PENDING })
  status!: OrganizationStatus;

  @ApiPropertyOptional()
  trialStartsAt?: string;

  @ApiPropertyOptional({ description: 'null means no trial limit.' })
  trialEndsAt?: string | null;
}
