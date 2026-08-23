import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MATERIAL_CATEGORIES } from '../material.constants';

export class CreateMaterialDto {
  @ApiProperty({ example: 'OPC 53 Grade Cement' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: MATERIAL_CATEGORIES, example: 'CEMENT' })
  @IsIn(MATERIAL_CATEGORIES)
  category!: string;

  @ApiProperty({ example: 'bag', description: 'Free text — units vary too widely by category (bag, kg, ton, sq ft, litre) to constrain to a fixed list.' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ example: 420, minimum: 0, description: 'No currency field, implicit default currency — matches Project.budget/Worker.dailyWage.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 500, minimum: 0, description: 'Current stock on hand.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0, description: 'Stock at or below this level is considered low — see GET /materials/low-stock.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 'Store in a dry place' })
  @IsOptional()
  @IsString()
  notes?: string;
}
