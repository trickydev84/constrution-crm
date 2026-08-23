import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsMongoId, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { QuotationLineItemDto } from './quotation-line-item.dto';

export class CreateQuotationDto {
  @ApiProperty({ example: '6a76f3f371b2754dd8478577', description: 'Lead._id this quotation is issued for — must already exist.' })
  @IsMongoId()
  leadId!: string;

  @ApiProperty({ type: [QuotationLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  lineItems!: QuotationLineItemDto[];

  @ApiPropertyOptional({ example: 18, minimum: 0, maximum: 100, description: 'GST/tax percentage, applied to the post-discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 100, description: 'Discount percentage, applied to the subtotal before tax' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'Valid for 30 days from issue date' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '50% advance, balance on completion' })
  @IsOptional()
  @IsString()
  terms?: string;
}
