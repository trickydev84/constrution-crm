import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { LeadStatus } from '../../../common/contracts';

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus, example: LeadStatus.CONTACTED, description: 'Not enum-validated at the API layer — any string is accepted and persisted as-is.' })
  @IsString()
  status!: string;
}
