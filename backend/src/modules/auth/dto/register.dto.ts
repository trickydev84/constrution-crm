import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Priya Mehta' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'priya@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8, description: 'Minimum 8 characters' })
  @IsString()
  @MinLength(8)
  password!: string;
}
