import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource, Role } from '../../common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @RequirePermission(Resource.USERS, 'view')
  @ApiOperation({
    summary: 'List users (paginated)',
    description: 'Read-only — this endpoint has no create/update routes. Accounts are created via POST /auth/register; there is no admin-facing "create user" flow yet. Never returns the password hash.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'role', required: false, enum: Role, description: 'Filter to a single role, e.g. to populate a Project Manager picker' })
  @ApiResponse({ status: 200, type: UserListResponseDto })
  @ApiResponse({ status: 403, description: 'Missing USERS:view permission' })
  list(@CurrentUser('organizationId') organizationId: string, @Query('page') page = '1', @Query('limit') limit = '20', @Query('role') role?: string) {
    return this.service.list(organizationId, Number(page), Number(limit), role ? { role } : {});
  }

  @Get(':id')
  @RequirePermission(Resource.USERS, 'view')
  @ApiOperation({ summary: 'Get a user by id', description: 'Never returns the password hash.' })
  @ApiParam({ name: 'id', example: '6a76ee8af71b6a002bc466dc' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Missing USERS:view permission' })
  get(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.findById(organizationId, id);
  }
}
