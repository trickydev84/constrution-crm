import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/contracts';

export class AuthUserDto {
  @ApiProperty({ example: '6a76ee8af71b6a002bc466dc' })
  id!: string;

  @ApiProperty({ example: 'Priya Mehta' })
  name!: string;

  @ApiProperty({ example: 'priya@example.com' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role!: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT bearer token, pass as `Authorization: Bearer <accessToken>`' })
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
