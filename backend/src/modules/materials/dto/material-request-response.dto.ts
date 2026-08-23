import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MATERIAL_REQUEST_STATUSES } from '../material.constants';

export class MaterialRequestResponseDto {
  @ApiProperty({ example: '6a76ff0e59f18410a51761f1' })
  _id!: string;

  @ApiProperty({ example: '6a76fb0e59f18410a51761a1' })
  projectId!: string;

  @ApiProperty({ example: '6a76ff0e59f18410a51761e1' })
  materialId!: string;

  @ApiProperty({ example: 50 })
  quantity!: number;

  @ApiProperty({ enum: MATERIAL_REQUEST_STATUSES, example: 'REQUESTED' })
  status!: string;

  @ApiPropertyOptional({ example: '6a76f3f371b2754dd8478577' })
  requestedBy?: string;

  @ApiProperty({ example: 'default' })
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Needed for foundation pour next week' })
  notes?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
