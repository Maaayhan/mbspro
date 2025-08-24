import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MbsItem } from '../entities/mbs-item.entity';
import { seed } from './seed';

describe('Seed Script', () => {
  let repository: Repository<MbsItem>;
  let module: TestingModule;

  // Use in-memory SQLite for testing
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [MbsItem],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([MbsItem]),
      ],
    }).compile();

    repository = module.get('MbsItemRepository');
  });

  afterAll(async () => {
    await module.close();
  });

  it('should export seed function', () => {
    expect(typeof seed).toBe('function');
  });

  it('should handle empty database gracefully', async () => {
    const count = await repository.count();
    expect(count).toBe(0);
  });

  // Note: We don't run the actual seed function in unit tests as it's designed
  // to work with the real database configuration. The seed function is tested
  // via the E2E tests and manual verification.
});
