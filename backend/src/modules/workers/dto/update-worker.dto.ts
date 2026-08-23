import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { WORKER_SKILL_CATEGORIES } from '../worker.constants';

export class UpdateWorkerDto {
  @ApiPropertyOptional({ example: 'Ramesh Yadav' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '9887711223' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: WORKER_SKILL_CATEGORIES, example: 'MASON' })
  @IsOptional()
  @IsIn(WORKER_SKILL_CATEGORIES)
  skillCategory?: string;

  @ApiPropertyOptional({ example: 800, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyWage?: number;

  @ApiPropertyOptional({ example: '6a76fb0e59f18410a51761a1', description: 'Project._id currently assigned to. Not validated against Projects yet.' })
  @IsOptional()
  @IsMongoId()
  assignedProjectId?: string;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Experienced with RCC work' })
  @IsOptional()
  @IsString()
  notes?: string;
}
