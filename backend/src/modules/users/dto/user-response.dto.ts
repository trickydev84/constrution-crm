import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/contracts';

// Deliberately omits `password` — the service layer excludes it at the query level
// (`.select('-password')`), not just here at the DTO/documentation level.
export class UserResponseDto {
  @ApiProperty({ example: '6a76ee8af71b6a002bc466dc' })
  _id!: string;

  @ApiProperty({ example: 'Ramesh Yadav' })
  name!: string;

  @ApiProperty({ example: 'ramesh@construction.local' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.PROJECT_MANAGER })
  role!: string;

  @ApiProperty({ example: 'default' })
  organizationId!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
