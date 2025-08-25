import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupabaseService } from '../services/supabase.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        ts: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
        database: { type: 'boolean', example: true }
      }
    }
  })
  async getHealth() {
    const databaseHealth = await this.supabaseService.healthCheck();
    
    return {
      ok: true,
      ts: new Date().toISOString(),
      database: databaseHealth,
    };
  }
}
