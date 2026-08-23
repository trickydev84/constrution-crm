import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { LeadResponseDto } from './lead-response.dto';

export class LeadListResponseDto {
  @ApiProperty({ type: [LeadResponseDto] })
  data!: LeadResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
