import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  @Public()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Liveness/readiness probe',
    description: 'Public and unthrottled — intended for load balancers and orchestrators. 200 when the MongoDB connection is usable, 503 otherwise.',
  })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'Database unreachable' })
  async check(): Promise<HealthResponseDto> {
    if (this.connection.readyState !== 1 || !this.connection.db) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    try {
      await this.connection.db.admin().ping();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
