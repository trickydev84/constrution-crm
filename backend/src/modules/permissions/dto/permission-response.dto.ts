import { ApiProperty } from '@nestjs/swagger';
import { Resource, Role } from '../../../common/contracts';

export class PermissionResponseDto {
  @ApiProperty({ example: '6a76fd0e59f18410a51761c3' })
  _id!: string;

  @ApiProperty({ enum: Role, example: Role.SALES })
  role!: string;

  @ApiProperty({ enum: Resource, example: Resource.LEADS })
  resource!: string;

  @ApiProperty({ example: 'acme-builders', description: 'Organization.slug this record belongs to.' })
  organizationId!: string;

  @ApiProperty({ example: true })
  canView!: boolean;

  @ApiProperty({ example: true })
  canWrite!: boolean;

  @ApiProperty({ example: false })
  canDelete!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
