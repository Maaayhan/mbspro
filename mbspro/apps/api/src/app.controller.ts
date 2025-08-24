import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application info' })
  @ApiResponse({ 
    status: 200, 
    description: 'Application information',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'MBSPro API' },
        version: { type: 'string', example: '1.0.0' },
        description: { type: 'string', example: 'MBSPro Backend API' }
      }
    }
  })
  getInfo() {
    return this.appService.getInfo();
  }
}
