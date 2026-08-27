import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CustomerResponseDto } from '../customers/dto/customer-response.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadListResponseDto } from './dto/lead-list-response.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService } from './leads.service';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private service: LeadsService) {}

  @Get()
  @RequirePermission(Resource.LEADS, 'view')
  @ApiOperation({ summary: 'List leads (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, type: LeadListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing LEADS:view permission' })
  list(@CurrentUser('organizationId') organizationId: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.list(organizationId, Number(page), Number(limit));
  }

  @Post()
  @RequirePermission(Resource.LEADS, 'write')
  @ApiOperation({ summary: 'Create a lead' })
  @ApiResponse({ status: 201, type: LeadResponseDto })
  @ApiResponse({ status: 403, description: 'Missing LEADS:write permission' })
  create(@CurrentUser('organizationId') organizationId: string, @Body() dto: CreateLeadDto) {
    return this.service.create(organizationId, dto);
  }

  @Patch(':id/status')
  @RequirePermission(Resource.LEADS, 'write')
  @ApiOperation({ summary: "Update a lead's status" })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd8478577' })
  @ApiResponse({ status: 200, type: LeadResponseDto })
  @ApiResponse({ status: 403, description: 'Missing LEADS:write permission' })
  status(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.service.updateStatus(organizationId, id, dto.status);
  }

  @Post(':id/convert')
  @RequirePermission(Resource.LEADS, 'write')
  @ApiOperation({
    summary: 'Convert a WON lead into a customer',
    description: 'Fails unless the lead\'s status is WON, and cannot be repeated once a customer has been created from this lead. Gated on LEADS:write only, even though it also creates a Customer — see .ai/BE/features/permissions.md for this accepted coarseness.',
  })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd8478577' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  @ApiResponse({ status: 400, description: "Lead status isn't WON" })
  @ApiResponse({ status: 403, description: 'Missing LEADS:write permission' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 409, description: 'Lead already converted to a customer' })
  convert(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.convertToCustomer(organizationId, id);
  }
}
