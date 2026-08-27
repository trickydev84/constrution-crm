import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateMaterialDto } from './dto/create-material.dto';
import { MaterialListResponseDto } from './dto/material-list-response.dto';
import { MaterialResponseDto } from './dto/material-response.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsService } from './materials.service';

@ApiTags('Materials')
@ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(private service: MaterialsService) {}

  @Get()
  @RequirePermission(Resource.MATERIALS, 'view')
  @ApiOperation({ summary: 'List materials (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, type: MaterialListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:view permission' })
  list(@CurrentUser('organizationId') organizationId: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.list(organizationId, Number(page), Number(limit));
  }

  @Get('low-stock')
  @RequirePermission(Resource.MATERIALS, 'view')
  @ApiOperation({
    summary: 'List materials at or below their reorder level',
    description: 'A plain array, not the {data,meta} paginated shape — a bounded "current alerts" view, not a growing collection.',
  })
  @ApiResponse({ status: 200, type: [MaterialResponseDto] })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:view permission' })
  lowStock(@CurrentUser('organizationId') organizationId: string) {
    return this.service.lowStock(organizationId);
  }

  @Get(':id')
  @RequirePermission(Resource.MATERIALS, 'view')
  @ApiOperation({ summary: 'Get a material by id' })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761e1' })
  @ApiResponse({ status: 200, type: MaterialResponseDto })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:view permission' })
  get(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.findById(organizationId, id);
  }

  @Post()
  @RequirePermission(Resource.MATERIALS, 'write')
  @ApiOperation({ summary: 'Add a material to the catalog' })
  @ApiResponse({ status: 201, type: MaterialResponseDto })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:write permission' })
  create(@CurrentUser('organizationId') organizationId: string, @Body() dto: CreateMaterialDto) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  @RequirePermission(Resource.MATERIALS, 'write')
  @ApiOperation({
    summary: 'Update a material',
    description: 'Includes stockQuantity for direct corrections (e.g. a manual audit). Fulfilling a material request is the normal way stock decreases — see PATCH /material-requests/:id/fulfill.',
  })
  @ApiParam({ name: 'id', example: '6a76ff0e59f18410a51761e1' })
  @ApiResponse({ status: 200, type: MaterialResponseDto })
  @ApiResponse({ status: 403, description: 'Missing MATERIALS:write permission' })
  update(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.service.update(organizationId, id, dto);
  }
}
