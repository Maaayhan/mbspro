import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'MBSPro API',
      version: '1.0.0',
      description: 'MBSPro Backend API',
    };
  }
}
