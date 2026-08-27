import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // Hardcoded limit, not env-read: a controller decorator evaluates at import time, the same
  // ordering hazard documented on JwtModule.registerAsync in auth.module.ts.
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Self-register a customer account',
    description: 'Public, unauthenticated. Always creates the account with role CUSTOMER — role is not accepted from the client. Staff accounts are created via the startup seeder or organization signup only. Off by default — disabled unless ALLOW_PUBLIC_REGISTRATION=true. Requires organizationSlug to reference an existing, ACTIVE organization. Rate-limited to 20 requests/minute per IP.',
  })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Email already registered' })
  @ApiResponse({ status: 403, description: 'Public registration is disabled' })
  @ApiResponse({ status: 404, description: 'organizationSlug does not reference an existing, ACTIVE organization' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password', description: 'Public, unauthenticated. Rate-limited to 20 requests/minute per IP.' })
  @ApiResponse({ status: 201, type: AuthResponseDto, description: 'Nest\'s default 201 for POST (no @HttpCode override)' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
