import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStage } from '../../../common/contracts';

export class ProjectResponseDto {
  @ApiProperty({ example: '6a76fb0e59f18410a51761a1' })
  _id!: string;

  @ApiProperty({ example: 'Sharma Residence' })
  name!: string;

  @ApiProperty({ example: '6a76f3f371b2754dd847857d' })
  customerId!: string;

  @ApiProperty({ enum: ProjectStage, example: ProjectStage.PLANNING })
  stage!: string;

  @ApiPropertyOptional({ example: '6a76ee8af71b6a002bc466dc' })
  projectManagerId?: string;

  @ApiPropertyOptional({ example: '6a76ee8af71b6a002bc466de' })
  supervisorId?: string;

  @ApiPropertyOptional({ example: 1850000 })
  budget?: number;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-03-01T00:00:00.000Z' })
  endDate?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100 })
  progressPercent?: number;

  @ApiProperty({ example: 'default' })
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Client requested premium fittings' })
  notes?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
