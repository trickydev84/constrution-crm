import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'; import { JwtService } from '@nestjs/jwt'; import * as bcrypt from 'bcrypt'; import { OrganizationStatus } from '../../common/contracts'; import { OrganizationsService } from '../organizations/organizations.service'; import { UsersService } from '../users/users.service'; import { RegisterDto } from './dto/register.dto';
@Injectable() export class AuthService {
  constructor(private users: UsersService, private organizations: OrganizationsService, private jwt: JwtService) {}

  // Public self-registration is off by default (ALLOW_PUBLIC_REGISTRATION unset/false → 403) —
  // registration into an arbitrary organization by an unauthenticated caller is a real hole once
  // organizationId stopped being a hardcoded constant. When enabled, the target org must exist and
  // be ACTIVE, matching the documented "customer self-signup for a specific org" intent.
  async register(input: RegisterDto) {
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') throw new ForbiddenException('Public registration is disabled');
    const org = await this.organizations.findBySlug(input.organizationSlug);
    if (!org || org.status !== OrganizationStatus.ACTIVE) throw new NotFoundException('Organization not found');
    if (await this.users.findByEmail(input.email)) throw new UnauthorizedException('Email already registered');
    const user = await this.users.create(org.slug, { name: input.name, email: input.email, password: await bcrypt.hash(input.password, 12), role: 'CUSTOMER' });
    return this.issue(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) throw new UnauthorizedException('Invalid credentials');
    return this.issue(user);
  }

  private async issue(user: any) {
    const org = await this.organizations.findBySlug(user.organizationId);
    return {
      accessToken: this.jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role, organizationId: user.organizationId }),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId },
      organization: org ? { name: org.name, slug: org.slug, status: org.status, trialEndsAt: org.trialEndsAt } : null,
    };
  }
}
