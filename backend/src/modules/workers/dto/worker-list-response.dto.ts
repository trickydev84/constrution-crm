import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { WorkerResponseDto } from './worker-response.dto';

export class WorkerListResponseDto {
  @ApiProperty({ type: [WorkerResponseDto] })
  data!: WorkerResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
