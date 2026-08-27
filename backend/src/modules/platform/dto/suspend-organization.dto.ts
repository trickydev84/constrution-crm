import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SuspendOrganizationDto {
  @ApiPropertyOptional({ example: 'Payment overdue by 30+ days.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
