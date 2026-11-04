import { Test } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { PrismaService } from './prisma.service.js';

describe('AppController', () => {
  it('reports the database as up after querying it', async () => {
    const $queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw } }],
    }).compile();

    await expect(app.get(AppController).health()).resolves.toEqual({ db: 'up' });
    expect($queryRaw).toHaveBeenCalledOnce();
  });
});
