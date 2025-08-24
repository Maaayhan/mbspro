import { Test, TestingModule } from '@nestjs/testing';
import { SuggestController } from './suggest.controller';
import { SuggestService } from './suggest.service';
import { SuggestRequestDto } from './dto/suggest-request.dto';

describe('SuggestController', () => {
  let controller: SuggestController;
  let service: SuggestService;

  const mockSuggestService = {
    suggest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuggestController],
      providers: [
        {
          provide: SuggestService,
          useValue: mockSuggestService,
        },
      ],
    }).compile();

    controller = module.get<SuggestController>(SuggestController);
    service = module.get<SuggestService>(SuggestService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call suggest service with correct parameters', async () => {
    const request: SuggestRequestDto = {
      note: 'Patient consultation for chronic pain management',
      topN: 5,
    };

    const expectedResponse = {
      candidates: [],
      signals: undefined,
    };

    mockSuggestService.suggest.mockResolvedValue(expectedResponse);

    const result = await controller.suggest(request);

    expect(service.suggest).toHaveBeenCalledWith(request);
    expect(result).toEqual(expectedResponse);
  });

  it('should handle suggest request without topN parameter', async () => {
    const request: SuggestRequestDto = {
      note: 'General consultation',
    };

    const expectedResponse = {
      candidates: [],
      signals: undefined,
    };

    mockSuggestService.suggest.mockResolvedValue(expectedResponse);

    const result = await controller.suggest(request);

    expect(service.suggest).toHaveBeenCalledWith(request);
    expect(result).toEqual(expectedResponse);
  });
});
