import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty({ example: '6a76f3f371b2754dd847857d' })
  _id!: string;

  @ApiProperty({ example: 'Priya Mehta' })
  name!: string;

  @ApiProperty({ example: '9998887777' })
  phone!: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '221B Baker Street, Bengaluru' })
  address?: string;

  @ApiPropertyOptional({ example: '6a76f3f371b2754dd8478577', description: 'The Lead._id this customer was converted from, if any.' })
  leadId?: string;

  @ApiProperty({ example: 'acme-builders', description: 'Organization.slug this record belongs to.' })
  organizationId!: string;

  @ApiPropertyOptional({ example: 'Prefers WhatsApp over email' })
  notes?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
