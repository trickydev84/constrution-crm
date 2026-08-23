import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { WORKER_AVAILABILITY_STATUSES } from '../worker.constants';

export class UpdateWorkerAvailabilityDto {
  @ApiProperty({ enum: WORKER_AVAILABILITY_STATUSES, example: 'ON_LEAVE' })
  @IsIn(WORKER_AVAILABILITY_STATUSES)
  availabilityStatus!: string;
}
