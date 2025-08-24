import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        ts: { type: 'string', example: '2023-01-01T00:00:00.000Z' }
      }
    }
  })
  getHealth() {
    return {
      ok: true,
      ts: new Date().toISOString(),
    };
  }
}
