import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SuggestService } from './suggest.service';
import { SuggestRequestDto } from './dto/suggest-request.dto';
import { SuggestResponseDto } from './dto/suggest-response.dto';

@ApiTags('suggestions')
@Controller('suggest')
export class SuggestController {
  constructor(private readonly suggestService: SuggestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Get MBS item suggestions',
    description: 'Analyze clinical notes and return relevant MBS item suggestions'
  })
  @ApiBody({ 
    type: SuggestRequestDto,
    description: 'Clinical note and optional parameters for suggestion analysis'
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully generated suggestions',
    type: SuggestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async suggest(@Body() request: SuggestRequestDto): Promise<SuggestResponseDto> {
    return this.suggestService.suggest(request);
  }

  @Post('explain-text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI explanation text for a candidate' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        title: { type: 'string' },
        rule_results: { type: 'array', items: { type: 'object' } },
        compliance: { type: 'string' },
        context: { type: 'object' },
      },
      required: ['code', 'title']
    }
  })
  async explainText(@Body() body: any) {
    const { code, title, rule_results, compliance } = body || {}
    const results = Array.isArray(rule_results) ? rule_results : []
    const fails = results.filter((r: any) => r.status === 'fail')
    const warns = results.filter((r: any) => r.status === 'warn')

    const lines: string[] = []
    lines.push(`${code || ''} — ${title || ''}.`)
    if (compliance === 'red') lines.push('Policy check: blocked.')
    else if (compliance === 'amber') lines.push('Policy check: needs review.')
    else lines.push('Policy check: ok.')

    if (fails.length > 0) {
      const why = fails.slice(0, 2).map((r: any) => `${r.id}: ${r.reason || 'not satisfied'}`).join(' | ')
      lines.push(`Failing rules → ${why}`)
    }
    if (warns.length > 0) {
      const why = warns.slice(0, 2).map((r: any) => `${r.id}: ${r.reason || 'check details'}`).join(' | ')
      lines.push(`Warnings → ${why}`)
    }

    const req = results.find((r: any) => r.id === 'required_elements' && r.status !== 'pass')
    if (req && typeof req.reason === 'string') {
      const m = req.reason.match(/Missing elements:\s*(.*)$/i)
      if (m && m[1]) lines.push(`Add documentation: ${m[1]}.`)
    }

    return { ok: true, text: lines.join(' ') }
  }

  @Post('alternatives')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get swap alternatives for a code under current context' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        note: { type: 'string' },
        currentCode: { type: 'string' },
        selectedCodes: { type: 'array', items: { type: 'string' } },
        context: { type: 'object' },
        topN: { type: 'number' }
      },
      required: ['note', 'currentCode']
    }
  })
  async alternatives(@Body() body: any) {
    return this.suggestService.alternatives(body);
  }
}
