import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: 'Priya Mehta' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '9998887777' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Website' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'Interested in a 3BHK apartment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
