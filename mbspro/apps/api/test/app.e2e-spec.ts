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

  describe('Application Info', () => {
    it('/api/ (GET) - should return application information', () => {
      return request(app.getHttpServer())
        .get('/api/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name', 'MBSPro API');
          expect(res.body).toHaveProperty('version', '1.0.0');
          expect(res.body).toHaveProperty('description');
        });
    });
  });

  describe('Suggest Endpoint', () => {
    it('POST /api/suggest with {note:"sample"} - should return 201 and have candidates array', () => {
      return request(app.getHttpServer())
        .post('/api/suggest')
        .send({
          note: 'sample'
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('candidates');
          expect(Array.isArray(res.body.candidates)).toBe(true);
          // Day-1 placeholder returns empty array
          expect(res.body.candidates).toHaveLength(0);
          // Day-1 placeholder has no signals
          expect(res.body.signals).toBeUndefined();
        });
    });

    it('POST /api/suggest with note and topN - should return 201 with proper structure', () => {
      return request(app.getHttpServer())
        .post('/api/suggest')
        .send({
          note: 'Patient consultation for chronic pain management',
          topN: 5
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('candidates');
          expect(Array.isArray(res.body.candidates)).toBe(true);
          expect(res.body.candidates).toHaveLength(0); // Day-1 placeholder
          expect(res.body.signals).toBeUndefined(); // Day-1 placeholder
        });
    });

    it('POST /api/suggest without note - should return 400 validation error', () => {
      return request(app.getHttpServer())
        .post('/api/suggest')
        .send({
          topN: 5
        })
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
        .send({
          note: 'sample note',
          topN: 0 // Invalid: should be >= 1
        })
        .expect(400);
    });

    it('POST /api/suggest with extra fields - should be filtered out by whitelist', () => {
      return request(app.getHttpServer())
        .post('/api/suggest')
        .send({
          note: 'sample note',
          topN: 3,
          extraField: 'should be ignored' // This should be filtered out
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('candidates');
          expect(Array.isArray(res.body.candidates)).toBe(true);
        });
    });
  });
});
