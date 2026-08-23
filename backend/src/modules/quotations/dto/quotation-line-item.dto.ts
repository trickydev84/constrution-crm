import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Min } from 'class-validator';

export class QuotationLineItemDto {
  @ApiProperty({ example: 'Cement (OPC 53 Grade), 50kg bags' })
  @IsString()
  description!: string;

  @ApiProperty({ enum: ['MATERIAL', 'LABOR'], example: 'MATERIAL' })
  @IsIn(['MATERIAL', 'LABOR'])
  category!: string;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: 420, minimum: 0, description: 'Price per unit' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}
