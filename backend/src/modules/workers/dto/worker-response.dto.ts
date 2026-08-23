import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WORKER_AVAILABILITY_STATUSES, WORKER_SKILL_CATEGORIES } from '../worker.constants';

export class WorkerResponseDto {
  @ApiProperty({ example: '6a76ff0e59f18410a51761d1' })
  _id!: string;

  @ApiProperty({ example: 'Ramesh Yadav' })
  name!: string;

  @ApiProperty({ example: '9887711223' })
  phone!: string;

  @ApiProperty({ enum: WORKER_SKILL_CATEGORIES, example: 'MASON' })
  skillCategory!: string;

  @ApiPropertyOptional({ example: 800 })
  dailyWage?: number;

  @ApiProperty({ enum: WORKER_AVAILABILITY_STATUSES, example: 'AVAILABLE' })
  availabilityStatus!: string;

  @ApiPropertyOptional({ example: '6a76fb0e59f18410a51761a1' })
  assignedProjectId?: string;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  rating?: number;

  @ApiProperty({ example: 'default' })
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Experienced with RCC work' })
  notes?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
