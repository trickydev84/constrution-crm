import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectListResponseDto } from './dto/project-list-response.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectStageDto } from './dto/update-project-stage.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Get()
  @RequirePermission(Resource.PROJECTS, 'view')
  @ApiOperation({ summary: 'List projects (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, type: ProjectListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing PROJECTS:view permission' })
  list(@CurrentUser('organizationId') organizationId: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.list(organizationId, Number(page), Number(limit));
  }

  @Get(':id')
  @RequirePermission(Resource.PROJECTS, 'view')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiParam({ name: 'id', example: '6a76fb0e59f18410a51761a1' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Missing PROJECTS:view permission' })
  get(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.findById(organizationId, id);
  }

  @Post()
  @RequirePermission(Resource.PROJECTS, 'write')
  @ApiOperation({ summary: 'Create a project for an existing customer' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Missing PROJECTS:write permission' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  create(@CurrentUser('organizationId') organizationId: string, @Body() dto: CreateProjectDto) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  @RequirePermission(Resource.PROJECTS, 'write')
  @ApiOperation({ summary: 'Update project details', description: 'customerId cannot be changed — a project cannot be reassigned to a different customer.' })
  @ApiParam({ name: 'id', example: '6a76fb0e59f18410a51761a1' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Missing PROJECTS:write permission' })
  update(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(organizationId, id, dto);
  }

  @Patch(':id/stage')
  @RequirePermission(Resource.PROJECTS, 'write')
  @ApiOperation({ summary: "Update a project's stage" })
  @ApiParam({ name: 'id', example: '6a76fb0e59f18410a51761a1' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'Missing PROJECTS:write permission' })
  stage(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() dto: UpdateProjectStageDto) {
    return this.service.updateStage(organizationId, id, dto.stage);
  }
}
