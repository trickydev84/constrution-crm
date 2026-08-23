import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { QuotationLineItemDto } from './quotation-line-item.dto';

export class UpdateQuotationDto {
  @ApiPropertyOptional({ type: [QuotationLineItemDto], description: 'If provided, replaces the entire line-item list — not a partial/incremental update.' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  lineItems?: QuotationLineItemDto[];

  @ApiPropertyOptional({ example: 18, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;

  @ApiPropertyOptional({ example: 5, minimum: 0, maximum: 100 })
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
