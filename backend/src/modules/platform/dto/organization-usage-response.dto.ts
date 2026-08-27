import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Every field here is a count or a timestamp — never a business record. If a future edit adds
// anything else to this DTO, the "master-admin has no business-data access" guarantee is broken.
export class OrganizationUsageResponseDto {
  @ApiProperty({ example: 'acme-builders' })
  organizationId!: string;

  @ApiProperty({ example: 3 })
  users!: number;

  @ApiProperty({ example: 12 })
  leads!: number;

  @ApiProperty({ example: 4 })
  customers!: number;

  @ApiProperty({ example: 2 })
  projects!: number;

  @ApiProperty({ example: 5 })
  quotations!: number;

  @ApiProperty({ example: 8 })
  workers!: number;

  @ApiProperty({ example: 20 })
  materials!: number;

  @ApiProperty({ example: 6 })
  materialRequests!: number;

  @ApiPropertyOptional({ description: 'Most recent createdAt across every counted collection, or null if the organization has no records at all.' })
  lastActivityAt?: string | null;
}
