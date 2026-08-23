import { ApiProperty } from '@nestjs/swagger';

export class QuotationLineItemResponseDto {
  @ApiProperty({ example: 'Cement (OPC 53 Grade), 50kg bags' })
  description!: string;

  @ApiProperty({ enum: ['MATERIAL', 'LABOR'], example: 'MATERIAL' })
  category!: string;

  @ApiProperty({ example: 100 })
  quantity!: number;

  @ApiProperty({ example: 420 })
  unitPrice!: number;

  @ApiProperty({ example: 42000, description: 'quantity × unitPrice, computed server-side — client-supplied amount, if any, is ignored' })
  amount!: number;
}
