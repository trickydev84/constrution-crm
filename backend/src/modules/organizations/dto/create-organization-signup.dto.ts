import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { SLUG_PATTERN } from '../organization.constants';

export class CreateOrganizationSignupDto {
  @ApiProperty({ example: 'Acme Builders Pvt Ltd' })
  @IsString()
  organizationName!: string;

  @ApiProperty({ example: 'acme-builders', description: 'URL-safe, lowercase, 1-32 chars, letters/digits/hyphens only. Immutable after creation — this becomes the tenant key stored on every record.' })
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase letters, digits, and hyphens only' })
  slug!: string;

  @ApiProperty({ example: 'Ramesh Yadav', description: "The organization's first user, created with role SUPERADMIN." })
  @IsString()
  adminName!: string;

  @ApiProperty({ example: 'ramesh@acmebuilders.com' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiPropertyOptional({ example: '9998887777' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}
