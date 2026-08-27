import { Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Resource, Role } from '../../common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { MyPermissionDto } from './dto/my-permission.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private service: PermissionsService) {}

  @Get()
  @RequirePermission(Resource.PERMISSIONS, 'view')
  @ApiOperation({
    summary: 'List the full role-permission matrix',
    description: 'SUPERADMIN-only in practice — no other role is seeded with PERMISSIONS access by default, and only SUPERADMIN can grant it.',
  })
  @ApiResponse({ status: 200, type: [PermissionResponseDto], description: 'A plain array, not the {data,meta} paginated shape used elsewhere — this is a small bounded set (roles × resources), not a growing collection.' })
  @ApiResponse({ status: 403, description: 'Caller\'s role lacks PERMISSIONS:view' })
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.service.listMatrix(organizationId);
  }

  @Get('me')
  @ApiOperation({
    summary: "Get the caller's own effective permissions",
    description:
      "Unlike GET /permissions (SUPERADMIN-only), this is open to any authenticated user — it only returns grants for the caller's own role, which they're already entitled to know. Deliberately undecorated with @RequirePermission (no PERMISSIONS:view check): requiring PERMISSIONS:view to look up your own permissions would be a chicken-and-egg lockout for every non-SUPERADMIN role. Intended for the frontend to decide which nav items/actions to show.",
  })
  @ApiResponse({ status: 200, type: [MyPermissionDto], description: 'One entry per Resource enum value, including resources with no stored grant (all three flags false). SUPERADMIN always gets every resource fully granted, independent of stored rows.' })
  @ApiResponse({ status: 401, description: 'No/invalid/expired token' })
  myPermissions(@CurrentUser() user: { role: Role; organizationId: string }) {
    return this.service.myPermissions(user.role, user.organizationId);
  }

  @Patch(':role/:resource')
  @RequirePermission(Resource.PERMISSIONS, 'write')
  @ApiOperation({
    summary: "Update a role's permissions for a resource",
    description: 'Upserts — succeeds even if no row exists yet for this role/resource pair.',
  })
  @ApiParam({ name: 'role', enum: Role })
  @ApiParam({ name: 'resource', enum: Resource })
  @ApiResponse({ status: 200, type: PermissionResponseDto })
  @ApiResponse({ status: 400, description: 'role or resource is not a valid enum value' })
  @ApiResponse({ status: 403, description: "Caller's role lacks PERMISSIONS:write" })
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('role', new ParseEnumPipe(Role)) role: Role,
    @Param('resource', new ParseEnumPipe(Resource)) resource: Resource,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.service.update(role, resource, organizationId, dto);
  }

  @Delete(':role/:resource')
  @RequirePermission(Resource.PERMISSIONS, 'delete')
  @ApiOperation({
    summary: "Remove a role's permission row for a resource",
    description: 'Functionally identical to PATCH-ing all three flags to false (both deny every action), but removes the row entirely rather than leaving a zero-grant row behind.',
  })
  @ApiParam({ name: 'role', enum: Role })
  @ApiParam({ name: 'resource', enum: Resource })
  @ApiResponse({ status: 200, type: PermissionResponseDto, description: 'The deleted row, or null if none existed' })
  @ApiResponse({ status: 400, description: 'role or resource is not a valid enum value' })
  @ApiResponse({ status: 403, description: "Caller's role lacks PERMISSIONS:delete" })
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('role', new ParseEnumPipe(Role)) role: Role,
    @Param('resource', new ParseEnumPipe(Resource)) resource: Resource,
  ) {
    return this.service.remove(role, resource, organizationId);
  }
}
