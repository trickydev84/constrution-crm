import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationLineItemResponseDto } from './quotation-line-item-response.dto';

export class QuotationResponseDto {
  @ApiProperty({ example: '6a76fd0e59f18410a51761c3' })
  _id!: string;

  @ApiProperty({ example: '6a76f3f371b2754dd8478577' })
  leadId!: string;

  @ApiProperty({ type: [QuotationLineItemResponseDto] })
  lineItems!: QuotationLineItemResponseDto[];

  @ApiProperty({ example: 18 })
  taxPercent!: number;

  @ApiProperty({ example: 5 })
  discountPercent!: number;

  @ApiProperty({ example: 42000, description: 'Sum of line item amounts, before discount/tax' })
  subtotal!: number;

  @ApiProperty({ example: 2100, description: 'subtotal × discountPercent / 100' })
  discountAmount!: number;

  @ApiProperty({ example: 7182, description: '(subtotal − discountAmount) × taxPercent / 100' })
  taxAmount!: number;

  @ApiProperty({ example: 47082, description: 'subtotal − discountAmount + taxAmount' })
  total!: number;

  @ApiPropertyOptional({ example: 'Valid for 30 days from issue date' })
  notes?: string;

  @ApiPropertyOptional({ example: '50% advance, balance on completion' })
  terms?: string;

  @ApiProperty({ example: 'acme-builders', description: 'Organization.slug this record belongs to.' })
  organizationId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
