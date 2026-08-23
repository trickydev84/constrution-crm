import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { MaterialRequestResponseDto } from './material-request-response.dto';

export class MaterialRequestListResponseDto {
  @ApiProperty({ type: [MaterialRequestResponseDto] })
  data!: MaterialRequestResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
