import { ApiProperty } from '@nestjs/swagger';
import { Resource } from '../../../common/contracts';

export class MyPermissionDto {
  @ApiProperty({ enum: Resource, example: Resource.LEADS })
  resource!: string;

  @ApiProperty({ example: true })
  canView!: boolean;

  @ApiProperty({ example: false })
  canWrite!: boolean;

  @ApiProperty({ example: false })
  canDelete!: boolean;
}
