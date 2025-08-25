import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('MBSPro API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same configuration as in main.ts
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    
    app.setGlobalPrefix('api');
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/api/health (GET) - should return 200 and ok=true', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ok', true);
          expect(res.body).toHaveProperty('ts');
          expect(typeof res.body.ts).toBe('string');
          // Verify timestamp is a valid ISO string
          expect(new Date(res.body.ts)).toBeInstanceOf(Date);
        });
    });
  });

  describe('Suggest Endpoint', () => {
    it('POST /api/suggest basic - returns candidates and signals', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/suggest')
        .send({ note: 'general practitioner consultation review 20 minutes' })
        .expect(201);
      expect(Array.isArray(res.body.candidates)).toBe(true);
      expect(res.body.candidates.length).toBeGreaterThanOrEqual(1);
      expect(res.body).toHaveProperty('signals');
      const c0 = res.body.candidates[0];
      expect(c0).toHaveProperty('code');
      expect(c0).toHaveProperty('title');
      expect(c0).toHaveProperty('score');
      expect(c0).toHaveProperty('score_breakdown');
      expect(c0).toHaveProperty('feature_hits');
      expect(c0).toHaveProperty('short_explain');
    });

    it('POST /api/suggest telehealth - includes telehealth item in Top-3', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/suggest')
        .send({ note: 'video consult 12 minutes for telehealth review' })
        .expect(201);

      const top3 = (res.body.candidates || []).slice(0, 3);
      const hasTelehealth = top3.some((c: any) => Array.isArray(c.feature_hits) && c.feature_hits.includes('telehealth'));
      expect(hasTelehealth).toBe(true);
    });

    it('POST /api/suggest after-hours - returns at least one candidate', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/suggest')
        .send({ note: 'after-hours urgent consultation 30 minutes' })
        .expect(201);
      expect((res.body.candidates || []).length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/suggest without note - should return 400 validation error', () => {
      return request(app.getHttpServer())
        .post('/api/suggest')
        .send({ topN: 5 })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('POST /api/suggest with invalid topN - should return 400 validation error', () => {
      return request(app.getHttpServer())
        .post('/api/suggest')
        .send({ note: 'sample note', topN: 0 })
        .expect(400);
    });
  });
});
