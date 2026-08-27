import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/contracts';
import { OrganizationResponseDto } from './organization-response.dto';

class SignupUserSummaryDto {
  @ApiProperty({ example: '6a76f3f371b2754dd8478579' })
  id!: string;

  @ApiProperty({ example: 'Ramesh Yadav' })
  name!: string;

  @ApiProperty({ example: 'ramesh@acmebuilders.com' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.SUPERADMIN })
  role!: string;

  @ApiProperty({ example: 'acme-builders' })
  organizationId!: string;
}

export class OrganizationSignupResponseDto {
  @ApiProperty({ type: OrganizationResponseDto })
  organization!: OrganizationResponseDto;

  @ApiProperty({ type: SignupUserSummaryDto })
  user!: SignupUserSummaryDto;
}
