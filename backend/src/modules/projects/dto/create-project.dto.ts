import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Sharma Residence' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '6a76f3f371b2754dd847857d', description: 'Customer._id this project belongs to — must already exist.' })
  @IsMongoId()
  customerId!: string;

  @ApiPropertyOptional({ example: '6a76ee8af71b6a002bc466dc', description: 'User._id of the assigned Project Manager. Not validated against Users yet.' })
  @IsOptional()
  @IsMongoId()
  projectManagerId?: string;

  @ApiPropertyOptional({ example: '6a76ee8af71b6a002bc466de', description: 'User._id of the assigned Site Supervisor. Not validated against Users yet.' })
  @IsOptional()
  @IsMongoId()
  supervisorId?: string;

  @ApiPropertyOptional({ example: 1850000, description: 'Budget amount — no multi-currency support yet, implicit default currency.' })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({ example: 'Client requested premium fittings' })
  @IsOptional()
  @IsString()
  notes?: string;
}
