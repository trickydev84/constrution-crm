import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectOrganizationDto {
  @ApiPropertyOptional({ example: 'Could not verify business registration details.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
