import { ApiProperty } from '@nestjs/swagger';

export class PlatformStatsResponseDto {
  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 3 })
  pending!: number;

  @ApiProperty({ example: 7 })
  active!: number;

  @ApiProperty({ example: 1 })
  suspended!: number;

  @ApiProperty({ example: 1 })
  rejected!: number;
}
