// src/vapi/vapi.controller.ts
import { Controller, Post } from '@nestjs/common';
import { VapiService } from './vapi.service';

@Controller('vapi')
export class VapiController {
  constructor(private readonly vapiService: VapiService) {}

  @Post('call')
  async createCall() {
    return this.vapiService.createCall();
  }
}