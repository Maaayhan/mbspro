import { Body, Controller, Post } from '@nestjs/common';
import type { MbsCodesRequestDTO, MbsCodesResponseDTO } from './types';
import { MbsCodesService } from './mbs.service';

@Controller('mbs-codes')
export class MbsCodesController {
  constructor(private readonly svc: MbsCodesService) {}

  @Post()
  async generate(@Body() body: MbsCodesRequestDTO): Promise<MbsCodesResponseDTO> {
    return this.svc.handle(body);
  }
}
