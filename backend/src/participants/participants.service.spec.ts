// Runs against the curebase_test database on the dev Postgres (vitest.config.ts points DATABASE_URL there and
// vitest.global-setup.ts migrates it), so dev data is never touched. Needs Postgres running (`pnpm db:up`).
// Deliberately not skipped when it is unreachable: the run fails, so a broken order can't hide behind a skip.
import { PrismaService } from '../prisma.service.js';
import { ParticipantsService } from './participants.service.js';

const PREFIX = 'pagination-test-';
const ROWS = 5;
// One timestamp for every row, so only the id tie-breaker decides their order.
const createdAt = new Date('2026-01-01T00:00:00Z');

describe('ParticipantsService.list against Postgres', () => {
  const prisma = new PrismaService();
  const service = new ParticipantsService(prisma);
  const cleanUp = () => prisma.participant.deleteMany({ where: { email: { startsWith: PREFIX } } });

  beforeAll(async () => {
    await cleanUp(); // leftovers from a killed run
    expect(await prisma.participant.count()).toBe(0); // so the test rows are the whole list
    await prisma.participant.createMany({
      data: Array.from({ length: ROWS }, (_, i) => ({
        name: `Pagination Test ${i}`,
        email: `${PREFIX}${i}@example.com`,
        phone: `+99900000${i}`, // +999 is no country's code, so it can't collide with a real participant
        dateOfBirth: new Date('1990-01-01'),
        weight: 70,
        weightUnit: 'kg' as const,
        height: 175,
        heightUnit: 'cm' as const,
        bmi: 22.86,
        createdAt,
      })),
    });
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  it('pages through rows with the same createdAt without duplicating or skipping any, in id desc order', async () => {
    const seen: string[] = [];
    for (let offset = 0; offset < ROWS; offset += 2) {
      const page = await service.list({ limit: 2, offset });
      expect(page).toMatchObject({ total: ROWS, limit: 2, offset });
      seen.push(...page.items.map((p) => p.id));
    }

    const inserted = await prisma.participant.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } });
    // cuids are [a-z0-9], so JS code-point order matches Postgres's text order here.
    const expected = inserted.map((p) => p.id).sort().reverse();
    expect(seen).toHaveLength(ROWS);
    expect(seen).toEqual(expected);
  });
});
