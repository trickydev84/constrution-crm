import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { ProjectResponseDto } from './project-response.dto';

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  data!: ProjectResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
