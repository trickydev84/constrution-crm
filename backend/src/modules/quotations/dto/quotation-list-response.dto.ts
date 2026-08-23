import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { QuotationResponseDto } from './quotation-response.dto';

export class QuotationListResponseDto {
  @ApiProperty({ type: [QuotationResponseDto] })
  data!: QuotationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
