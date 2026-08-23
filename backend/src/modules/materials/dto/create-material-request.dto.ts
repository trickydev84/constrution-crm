import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMaterialRequestDto {
  @ApiProperty({ example: '6a76fb0e59f18410a51761a1', description: 'Project._id this material is requested for. Not validated against Projects yet — matches Worker.assignedProjectId.' })
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ example: '6a76ff0e59f18410a51761e1', description: 'Material._id — must already exist.' })
  @IsMongoId()
  materialId!: string;

  @ApiProperty({ example: 50, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ example: '6a76f3f371b2754dd8478577', description: 'User._id of the requester. Not validated — no GET /users endpoint exists yet to check against.' })
  @IsOptional()
  @IsString()
  requestedBy?: string;

  @ApiPropertyOptional({ example: 'Needed for foundation pour next week' })
  @IsOptional()
  @IsString()
  notes?: string;
}
