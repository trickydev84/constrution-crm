import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MATERIAL_CATEGORIES } from '../material.constants';

export class UpdateMaterialDto {
  @ApiPropertyOptional({ example: 'OPC 53 Grade Cement' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: MATERIAL_CATEGORIES, example: 'CEMENT' })
  @IsOptional()
  @IsIn(MATERIAL_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ example: 'bag' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 420, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 500, minimum: 0, description: "Direct stock correction (e.g. a manual audit). Fulfilling a material request is the normal way stock decreases — see PATCH /material-requests/:id/fulfill." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 'Store in a dry place' })
  @IsOptional()
  @IsString()
  notes?: string;
}
