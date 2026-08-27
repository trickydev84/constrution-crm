import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationStatus } from '../../common/contracts';
import { CurrentPlatformAdmin } from './decorators/current-platform-admin.decorator';
import { PlatformAdminOnly } from './decorators/platform-admin-only.decorator';
import { OrganizationListResponseDto } from './dto/organization-list-response.dto';
import { OrganizationUsageResponseDto } from './dto/organization-usage-response.dto';
import { PlatformStatsResponseDto } from './dto/platform-stats-response.dto';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { OrganizationResponseDto } from '../organizations/dto/organization-response.dto';

@ApiTags('Platform')
@Controller('platform')
@PlatformAdminOnly()
export class PlatformOrganizationsController {
  constructor(private service: PlatformOrganizationsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Organization counts by status' })
  @ApiResponse({ status: 200, type: PlatformStatsResponseDto })
  stats() {
    return this.service.stats();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations (paginated, optional status/name filter)' })
  @ApiQuery({ name: 'status', required: false, enum: OrganizationStatus })
  @ApiQuery({ name: 'q', required: false, description: 'Case-insensitive name substring filter' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, type: OrganizationListResponseDto })
  list(
    @Query('status') status?: OrganizationStatus,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.list(status, Number(page), Number(limit), q);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get an organization by id' })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async get(@Param('id') id: string) {
    const org = await this.service.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  @Patch('organizations/:id/approve')
  @ApiOperation({ summary: 'Approve a pending organization' })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Organization is not PENDING' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  approve(@CurrentPlatformAdmin('sub') adminId: string, @Param('id') id: string) {
    return this.service.approve(id, adminId);
  }

  @Patch('organizations/:id/reject')
  @ApiOperation({ summary: 'Reject a pending organization' })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Organization is not PENDING' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  reject(@Param('id') id: string, @Body() dto: RejectOrganizationDto) {
    return this.service.reject(id, dto.reason);
  }

  @Patch('organizations/:id/suspend')
  @ApiOperation({ summary: 'Suspend an active organization' })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Organization is not ACTIVE' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  suspend(@Param('id') id: string, @Body() dto: SuspendOrganizationDto) {
    return this.service.suspend(id, dto.reason);
  }

  @Patch('organizations/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended organization' })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: OrganizationResponseDto })
  @ApiResponse({ status: 400, description: 'Organization is not SUSPENDED' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  reactivate(@Param('id') id: string) {
    return this.service.reactivate(id);
  }

  @Get('organizations/:id/usage')
  @ApiOperation({
    summary: "An organization's usage counts",
    description: 'Counts and timestamps only — never actual business records. This is the enforcement boundary for "master-admin has no business-data access."',
  })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: OrganizationUsageResponseDto })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async usage(@Param('id') id: string) {
    const usage = await this.service.usageFor(id);
    if (!usage) throw new NotFoundException('Organization not found');
    return usage;
  }
}
