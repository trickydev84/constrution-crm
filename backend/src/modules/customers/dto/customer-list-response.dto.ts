import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { CustomerResponseDto } from './customer-response.dto';

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerResponseDto] })
  data!: CustomerResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
