import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import * as request from 'supertest';
import { HealthController } from './health.controller';

describe('HealthController (e2e, no real database)', () => {
  let app: INestApplication;
  let connectionStub: { readyState: number; db: { admin: () => { ping: jest.Mock } } };

  beforeEach(async () => {
    connectionStub = { readyState: 1, db: { admin: () => ({ ping: jest.fn().mockResolvedValue({}) }) } };

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getConnectionToken(), useValue: connectionStub }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with a status/timestamp body when Mongo is connected and reachable', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('returns 503 when the connection is not ready', async () => {
    connectionStub.readyState = 0;
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(503);
  });

  it('returns 503 when the connection reports ready but the ping fails', async () => {
    connectionStub.db.admin = () => ({ ping: jest.fn().mockRejectedValue(new Error('down')) });
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(503);
  });
});
