import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '../../../common/contracts';

export class LeadResponseDto {
  @ApiProperty({ example: '6a76f3f371b2754dd8478577' })
  _id!: string;

  @ApiProperty({ example: 'Priya Mehta' })
  name!: string;

  @ApiProperty({ example: '9998887777' })
  phone!: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Website' })
  source?: string;

  @ApiProperty({ enum: LeadStatus, example: LeadStatus.NEW })
  status!: string;

  @ApiProperty({ example: 'default' })
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Interested in a 3BHK apartment' })
  notes?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
