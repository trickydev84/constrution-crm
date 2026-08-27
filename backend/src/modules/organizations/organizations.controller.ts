import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AllowInactiveOrganization } from './decorators/allow-inactive-organization.decorator';
import { CreateOrganizationSignupDto } from './dto/create-organization-signup.dto';
import { MyOrganizationResponseDto } from './dto/my-organization-response.dto';
import { OrganizationSignupResponseDto } from './dto/organization-signup-response.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private service: OrganizationsService) {}

  // Hardcoded limit, not env-read — same import-time-evaluation hazard documented on
  // JwtModule.registerAsync in auth.module.ts and the throttle literals in auth.controller.ts.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('signup')
  @ApiOperation({
    summary: 'Sign up a new organization',
    description: "Public, unauthenticated. Creates the organization (status PENDING) and its first user (role SUPERADMIN). Deliberately returns no accessToken — the organization is PENDING, so every protected route would 403 anyway; the caller should route to a pending-approval screen and let the user log in normally once approved.",
  })
  @ApiResponse({ status: 201, type: OrganizationSignupResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or reserved slug' })
  @ApiResponse({ status: 409, description: 'Slug or email already taken' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async signup(@Body() dto: CreateOrganizationSignupDto) {
    const { organization, user } = await this.service.signup(dto);
    return {
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        contactEmail: organization.contactEmail,
        contactPhone: organization.contactPhone,
        ownerUserId: organization.ownerUserId,
        trialStartsAt: organization.trialStartsAt,
        trialEndsAt: organization.trialEndsAt,
        createdAt: (organization as any).createdAt,
        updatedAt: (organization as any).updatedAt,
      },
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organizationId: organization.slug },
    };
  }

  @ApiBearerAuth()
  @Get('me')
  @AllowInactiveOrganization()
  @ApiOperation({
    summary: "Get the caller's own organization",
    description: 'Exempted from OrganizationStatusGuard (via @AllowInactiveOrganization()) so a pending/suspended/rejected organization\'s users can discover their own status — every other route 403s for them until the platform admin approves.',
  })
  @ApiResponse({ status: 200, type: MyOrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'No/invalid/expired token' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async me(@CurrentUser('organizationId') organizationId: string) {
    const org = await this.service.findBySlug(organizationId);
    if (!org) throw new NotFoundException('Organization not found');
    return { name: org.name, slug: org.slug, status: org.status, trialStartsAt: org.trialStartsAt, trialEndsAt: org.trialEndsAt };
  }
}
