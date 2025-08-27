import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { SupabaseService } from '../services/supabase.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: SupabaseService,
          useValue: { healthCheck: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status', async () => {
    const result = await controller.getHealth();
    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('ts');
    expect(typeof result.ts).toBe('string');
  });
});
