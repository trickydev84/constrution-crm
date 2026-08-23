import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Sharma Residence' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '6a76ee8af71b6a002bc466dc' })
  @IsOptional()
  @IsMongoId()
  projectManagerId?: string;

  @ApiPropertyOptional({ example: '6a76ee8af71b6a002bc466de' })
  @IsOptional()
  @IsMongoId()
  supervisorId?: string;

  @ApiPropertyOptional({ example: 1850000 })
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

  @ApiPropertyOptional({ example: 42, minimum: 0, maximum: 100 })
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
