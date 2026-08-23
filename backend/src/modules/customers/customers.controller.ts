import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource } from '../../common/contracts';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerListResponseDto } from './dto/customer-list-response.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  @RequirePermission(Resource.CUSTOMERS, 'view')
  @ApiOperation({ summary: 'List customers (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiResponse({ status: 200, type: CustomerListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing CUSTOMERS:view permission' })
  list(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.list('default', Number(page), Number(limit));
  }

  @Get(':id')
  @RequirePermission(Resource.CUSTOMERS, 'view')
  @ApiOperation({ summary: 'Get a customer by id' })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 403, description: 'Missing CUSTOMERS:view permission' })
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @RequirePermission(Resource.CUSTOMERS, 'write')
  @ApiOperation({ summary: 'Create a customer directly (not via lead conversion)' })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  @ApiResponse({ status: 403, description: 'Missing CUSTOMERS:write permission' })
  create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission(Resource.CUSTOMERS, 'write')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', example: '6a76f3f371b2754dd847857d' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 403, description: 'Missing CUSTOMERS:write permission' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }
}
