import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { ParticipantsController } from './participants/participants.controller.js';

// The DI graph is only exercised at boot: this fails if a provider (e.g. a DAL's PrismaService) can't be resolved.
it('resolves the whole module graph', async () => {
  const app = await Test.createTestingModule({ imports: [AppModule] }).compile();
  try {
    expect(app.get(ParticipantsController)).toBeInstanceOf(ParticipantsController);
  } finally {
    await app.close(); // runs the shutdown hooks, so PrismaService disconnects
  }
});
