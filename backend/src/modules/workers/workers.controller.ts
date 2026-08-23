import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../common/contracts';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerAvailabilityDto } from './dto/update-worker-availability.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerListResponseDto } from './dto/worker-list-response.dto';
import { WorkerResponseDto } from './dto/worker-response.dto';
import { WorkersService } from './workers.service';

@ApiTags('Workers')
@ApiBearerAuth()
@Controller('workers')
export class WorkersController {
  constructor(private service: WorkersService) {}

  @Get()
  @RequirePermission(Resource.WORKERS, 'view')
  @ApiOperation({ summary: 'List workers (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, type: WorkerListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing WORKERS:view permission' })
  list(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.list('default', Number(page), Number(limit));
  }

  @Get(':id')
  @RequirePermission(Resource.WORKERS, 'view')
  @ApiOperation({ summary: 'Get a worker by id' })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761d1' })
  @ApiResponse({ status: 200, type: WorkerResponseDto })
  @ApiResponse({ status: 403, description: 'Missing WORKERS:view permission' })
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission(Resource.WORKERS, 'write')
  @ApiOperation({ summary: 'Create a worker profile' })
  @ApiResponse({ status: 201, type: WorkerResponseDto })
  @ApiResponse({ status: 403, description: 'Missing WORKERS:write permission' })
  create(@Body() dto: CreateWorkerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission(Resource.WORKERS, 'write')
  @ApiOperation({ summary: 'Update a worker profile', description: 'Use PATCH /workers/:id/availability to change availabilityStatus instead.' })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761d1' })
  @ApiResponse({ status: 200, type: WorkerResponseDto })
  @ApiResponse({ status: 403, description: 'Missing WORKERS:write permission' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkerDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/availability')
  @RequirePermission(Resource.WORKERS, 'write')
  @ApiOperation({ summary: "Update a worker's availability status" })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761d1' })
  @ApiResponse({ status: 200, type: WorkerResponseDto })
  @ApiResponse({ status: 403, description: 'Missing WORKERS:write permission' })
  availability(@Param('id') id: string, @Body() dto: UpdateWorkerAvailabilityDto) {
    return this.service.updateAvailability(id, dto.availabilityStatus);
  }
}
