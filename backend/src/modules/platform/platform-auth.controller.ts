import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { PlatformLoginResponseDto } from './dto/platform-login-response.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformAuthService } from './platform-auth.service';

@ApiTags('Platform')
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private auth: PlatformAuthService) {}

  // Hardcoded limit, not env-read — same import-time-evaluation hazard as every other @Throttle()
  // literal in this codebase (see auth.module.ts's JwtModule.registerAsync comment).
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Platform admin login', description: 'Public, unauthenticated. Issues a token signed with PLATFORM_JWT_SECRET — a separate secret from org tokens, not usable on any org-scoped route.' })
  @ApiResponse({ status: 201, type: PlatformLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  login(@Body() dto: PlatformLoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
