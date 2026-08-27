import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { OrganizationResponseDto } from '../../organizations/dto/organization-response.dto';

export class OrganizationListResponseDto {
  @ApiProperty({ type: [OrganizationResponseDto] })
  data!: OrganizationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
