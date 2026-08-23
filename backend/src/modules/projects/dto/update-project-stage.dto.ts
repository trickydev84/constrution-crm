import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ProjectStage } from '../../../common/contracts';

export class UpdateProjectStageDto {
  @ApiProperty({ enum: ProjectStage, example: ProjectStage.FOUNDATION, description: 'Not enum-validated at the API layer — any string is accepted and persisted as-is.' })
  @IsString()
  stage!: string;
}
