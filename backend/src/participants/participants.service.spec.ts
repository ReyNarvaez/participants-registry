// Needs the dev Postgres (`pnpm db:up`, DATABASE_URL from backend/.env). Deliberately not skipped when it is
// unreachable: the test then fails, so a broken pagination order can't hide behind a silent skip.
import { existsSync } from 'node:fs';
import { PrismaService } from '../prisma.service.js';
import { ParticipantsService } from './participants.service.js';

if (existsSync('.env')) process.loadEnvFile();

const PREFIX = 'pagination-test-';
const ROWS = 5;
// One timestamp for every row, far in the future so these rows are the newest and fill the first pages.
const createdAt = new Date('2999-01-01T00:00:00Z');

describe('ParticipantsService.list against Postgres', () => {
  const prisma = new PrismaService();
  const service = new ParticipantsService(prisma);
  const cleanUp = () => prisma.participant.deleteMany({ where: { email: { startsWith: PREFIX } } });

  beforeAll(async () => {
    await cleanUp(); // leftovers from a crashed run
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
      expect(page).toMatchObject({ limit: 2, offset });
      expect(page.total).toBeGreaterThanOrEqual(ROWS);
      seen.push(...page.items.filter((p) => p.createdAt.getTime() === createdAt.getTime()).map((p) => p.id));
    }

    const inserted = await prisma.participant.findMany({ where: { email: { startsWith: PREFIX } }, select: { id: true } });
    // cuids are [a-z0-9], so JS code-point order matches Postgres's text order here.
    const expected = inserted.map((p) => p.id).sort().reverse();
    expect(seen).toHaveLength(ROWS);
    expect(seen).toEqual(expected);
  });
});
