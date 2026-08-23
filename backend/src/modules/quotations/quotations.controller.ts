import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../common/contracts';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { QuotationListResponseDto } from './dto/quotation-list-response.dto';
import { QuotationResponseDto } from './dto/quotation-response.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('Quotations')
@ApiBearerAuth()
@Controller('quotations')
export class QuotationsController {
  constructor(private service: QuotationsService) {}

  @Get()
  @RequirePermission(Resource.QUOTATIONS, 'view')
  @ApiOperation({ summary: 'List quotations (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, type: QuotationListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing QUOTATIONS:view permission' })
  list(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.list('default', Number(page), Number(limit));
  }

  @Get(':id')
  @RequirePermission(Resource.QUOTATIONS, 'view')
  @ApiOperation({ summary: 'Get a quotation by id' })
  @ApiParam({ name: 'id', example: '6a76fd0e59f18410a51761c3' })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @ApiResponse({ status: 403, description: 'Missing QUOTATIONS:view permission' })
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission(Resource.QUOTATIONS, 'write')
  @ApiOperation({
    summary: 'Create a quotation for an existing lead',
    description: "subtotal/discountAmount/taxAmount/total and each line item's amount are computed server-side — discount is applied before tax. Client-supplied totals, if any, are ignored.",
  })
  @ApiResponse({ status: 201, type: QuotationResponseDto })
  @ApiResponse({ status: 403, description: 'Missing QUOTATIONS:write permission' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  create(@Body() dto: CreateQuotationDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission(Resource.QUOTATIONS, 'write')
  @ApiOperation({
    summary: 'Update a quotation',
    description: 'leadId cannot be changed. Providing lineItems replaces the entire list. Totals are always recomputed server-side, even if only notes/terms changed.',
  })
  @ApiParam({ name: 'id', example: '6a76fd0e59f18410a51761c3' })
  @ApiResponse({ status: 200, type: QuotationResponseDto })
  @ApiResponse({ status: 403, description: 'Missing QUOTATIONS:write permission' })
  update(@Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    return this.service.update(id, dto);
  }
}
