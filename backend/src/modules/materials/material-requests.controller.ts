import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../common/contracts';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateMaterialRequestDto } from './dto/create-material-request.dto';
import { MaterialRequestListResponseDto } from './dto/material-request-list-response.dto';
import { MaterialRequestResponseDto } from './dto/material-request-response.dto';
import { MaterialRequestsService } from './material-requests.service';

@ApiTags('Material requests')
@ApiBearerAuth()
@Controller('material-requests')
export class MaterialRequestsController {
  constructor(private service: MaterialRequestsService) {}

  @Get()
  @RequirePermission(Resource.MATERIALS, 'view')
  @ApiOperation({ summary: 'List material requests (paginated)', description: 'Gated on the same MATERIALS resource as the catalog — requests are part of the materials domain, not a separate permission.' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'projectId', required: false, example: '6a76fb0e59f18410a51761a1' })
  @ApiQuery({ name: 'status', required: false, enum: ['REQUESTED', 'APPROVED', 'FULFILLED', 'REJECTED'] })
  @ApiResponse({ status: 200, type: MaterialRequestListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:view permission' })
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    const filter: { projectId?: string; status?: string } = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    return this.service.list('default', Number(page), Number(limit), filter);
  }

  @Get(':id')
  @RequirePermission(Resource.MATERIALS, 'view')
  @ApiOperation({ summary: 'Get a material request by id' })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761f1' })
  @ApiResponse({ status: 200, type: MaterialRequestResponseDto })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:view permission' })
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission(Resource.MATERIALS, 'write')
  @ApiOperation({ summary: 'Request materials for a project', description: 'Starts in REQUESTED status. materialId must reference an existing material.' })
  @ApiResponse({ status: 201, type: MaterialRequestResponseDto })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:write permission' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  create(@Body() dto: CreateMaterialRequestDto) {
    return this.service.create(dto);
  }

  @Patch(':id/approve')
  @RequirePermission(Resource.MATERIALS, 'write')
  @ApiOperation({ summary: 'Approve a material request', description: 'REQUESTED → APPROVED only. Does not touch stock.' })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761f1' })
  @ApiResponse({ status: 200, type: MaterialRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Request is not in REQUESTED status' })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:write permission' })
  @ApiResponse({ status: 404, description: 'Material request not found' })
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Patch(':id/reject')
  @RequirePermission(Resource.MATERIALS, 'write')
  @ApiOperation({ summary: 'Reject a material request', description: 'REQUESTED or APPROVED → REJECTED. Fails if already FULFILLED or REJECTED.' })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761f1' })
  @ApiResponse({ status: 200, type: MaterialRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Request is already FULFILLED or REJECTED' })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:write permission' })
  @ApiResponse({ status: 404, description: 'Material request not found' })
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }

  @Patch(':id/fulfill')
  @RequirePermission(Resource.MATERIALS, 'write')
  @ApiOperation({
    summary: 'Fulfill a material request',
    description: 'APPROVED → FULFILLED, and atomically decrements the material\'s stockQuantity by the requested quantity. Fails with 400 if stock is insufficient at fulfillment time, even if it was sufficient when requested/approved — stock is a shared pool other requests can drain in the meantime.',
  })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761f1' })
  @ApiResponse({ status: 200, type: MaterialRequestResponseDto })
  @ApiResponse({ status: 400, description: 'Request is not APPROVED, or current stock is less than the requested quantity' })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:write permission' })
  @ApiResponse({ status: 404, description: 'Material request not found' })
  fulfill(@Param('id') id: string) {
    return this.service.fulfill(id);
  }
}
