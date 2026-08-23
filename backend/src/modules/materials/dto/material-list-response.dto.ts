import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { MaterialResponseDto } from './material-response.dto';

export class MaterialListResponseDto {
  @ApiProperty({ type: [MaterialResponseDto] })
  data!: MaterialResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
