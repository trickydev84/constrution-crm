import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Priya Mehta' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '9998887777' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '221B Baker Street, Bengaluru' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Prefers WhatsApp over email' })
  @IsOptional()
  @IsString()
  notes?: string;
}
