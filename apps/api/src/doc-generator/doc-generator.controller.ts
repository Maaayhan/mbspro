import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DocGeneratorService } from './doc-generator.service';
import { GenerateDocRequestDto } from './dto/generate-doc-request.dto';
import { GenerateDocResponseDto } from './dto/generate-doc-response.dto';

@ApiTags('document-generation')
@Controller('generate-doc')
export class DocGeneratorController {
  constructor(private readonly docGeneratorService: DocGeneratorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Generate medical document',
    description: 'Generate professional medical documents (referrals or care plans) using clinical notes, patient information, and selected MBS items'
  })
  @ApiBody({ 
    type: GenerateDocRequestDto,
    description: 'Document generation request with patient data, clinical notes, and MBS items'
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully generated document',
    type: GenerateDocResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters or missing data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during document generation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Failed to generate document' },
        error: { type: 'string', example: 'Internal Server Error' }
      }
    }
  })
  async generateDocument(@Body() request: GenerateDocRequestDto): Promise<GenerateDocResponseDto> {
    return this.docGeneratorService.generateDocument(request);
  }
}
