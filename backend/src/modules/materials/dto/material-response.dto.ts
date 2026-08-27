import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MATERIAL_CATEGORIES } from '../material.constants';

export class MaterialResponseDto {
  @ApiProperty({ example: '6a76ff0e59f18410a51761e1' })
  _id!: string;

  @ApiProperty({ example: 'OPC 53 Grade Cement' })
  name!: string;

  @ApiProperty({ enum: MATERIAL_CATEGORIES, example: 'CEMENT' })
  category!: string;

  @ApiProperty({ example: 'bag' })
  unit!: string;

  @ApiProperty({ example: 420 })
  unitPrice!: number;

  @ApiProperty({ example: 500 })
  stockQuantity!: number;

  @ApiProperty({ example: 100 })
  reorderLevel!: number;

  @ApiProperty({ example: 'acme-builders', description: 'Organization.slug this record belongs to.' })
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Store in a dry place' })
  notes?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
