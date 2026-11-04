import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { PrismaService } from './common/prisma/prisma.service.js';
import { ParticipantsController } from './participants/participants.controller.js';

// The DI graph is only exercised at boot: this fails if a provider (e.g. a DAL's PrismaService) can't be resolved.
it('resolves the whole module graph', async () => {
  const app = await Test.createTestingModule({ imports: [AppModule] }).compile();
  expect(app.get(ParticipantsController)).toBeInstanceOf(ParticipantsController);
  await app.get(PrismaService).$disconnect();
});
