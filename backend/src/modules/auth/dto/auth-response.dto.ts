import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus, Role } from '../../../common/contracts';

export class AuthUserDto {
  @ApiProperty({ example: '6a76ee8af71b6a002bc466dc' })
  id!: string;

  @ApiProperty({ example: 'Priya Mehta' })
  name!: string;

  @ApiProperty({ example: 'priya@example.com' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role!: string;

  @ApiProperty({ example: 'acme-builders', description: 'Organization.slug this account belongs to.' })
  organizationId!: string;
}

export class AuthOrganizationDto {
  @ApiProperty({ example: 'Acme Builders Pvt Ltd' })
  name!: string;

  @ApiProperty({ example: 'acme-builders' })
  slug!: string;

  @ApiProperty({ enum: OrganizationStatus, example: OrganizationStatus.ACTIVE, description: 'Drives whether the frontend routes to the app or to a pending/suspended holding screen.' })
  status!: OrganizationStatus;

  @ApiPropertyOptional({ description: 'null means no trial limit.' })
  trialEndsAt?: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT bearer token, pass as `Authorization: Bearer <accessToken>`' })
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiPropertyOptional({ type: AuthOrganizationDto, description: 'null if the account\'s organization could not be resolved (should not happen in practice).' })
  organization?: AuthOrganizationDto | null;
}
