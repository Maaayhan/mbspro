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
}
