import { ApiProperty } from '@nestjs/swagger';

class PlatformAdminSummaryDto {
  @ApiProperty({ example: '6a76f3f371b2754dd8478590' })
  id!: string;

  @ApiProperty({ example: 'Platform Administrator' })
  name!: string;

  @ApiProperty({ example: 'platform-admin@construction.local' })
  email!: string;
}

export class PlatformLoginResponseDto {
  @ApiProperty({ description: 'JWT signed with PLATFORM_JWT_SECRET — a completely different secret from org tokens. Not usable on any org-scoped route.' })
  accessToken!: string;

  @ApiProperty({ type: PlatformAdminSummaryDto })
  admin!: PlatformAdminSummaryDto;
}
