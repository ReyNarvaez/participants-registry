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

describe('ParticipantsService.list BMI filter against Postgres', () => {
  const prisma = new PrismaService();
  const service = new ParticipantsService(prisma);
  const BMI_PREFIX = 'bmi-filter-test-';
  const cleanUp = () => prisma.participant.deleteMany({ where: { email: { startsWith: BMI_PREFIX } } });
  // Rows exactly at the bounds (18.5, 25) and just outside them (18.49, 25.01). Index i is also the createdAt order.
  const bmis = [18.49, 18.5, 22, 25, 25.01];
  const bmisOf = (page: { items: { bmi: number }[] }) => page.items.map((p) => p.bmi);

  beforeAll(async () => {
    await cleanUp();
    expect(await prisma.participant.count()).toBe(0);
    await prisma.participant.createMany({
      data: bmis.map((bmi, i) => ({
        name: `BMI Filter Test ${i}`,
        email: `${BMI_PREFIX}${i}@example.com`,
        phone: `+99910000${i}`,
        dateOfBirth: new Date('1990-01-01'),
        weight: 70,
        weightUnit: 'kg' as const,
        height: 175,
        heightUnit: 'cm' as const,
        bmi,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
      })),
    });
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
  });

  it('includes rows exactly at both bounds, excludes rows just outside, and counts only matches in total', async () => {
    const page = await service.list({ limit: 20, offset: 0, minBmi: 18.5, maxBmi: 25 });
    expect(page.total).toBe(3);
    expect(bmisOf(page)).toEqual([25, 22, 18.5]); // newest first
  });

  it('applies a lone min or max bound', async () => {
    expect(bmisOf(await service.list({ limit: 20, offset: 0, minBmi: 25 }))).toEqual([25.01, 25]);
    expect(bmisOf(await service.list({ limit: 20, offset: 0, maxBmi: 18.5 }))).toEqual([18.5, 18.49]);
    expect((await service.list({ limit: 20, offset: 0, minBmi: 22, maxBmi: 22 })).total).toBe(1);
  });

  it('pages through only the matching rows', async () => {
    const range = { minBmi: 18.5, maxBmi: 25 };
    const first = await service.list({ limit: 2, offset: 0, ...range });
    const second = await service.list({ limit: 2, offset: 2, ...range });
    expect(first).toMatchObject({ total: 3, limit: 2, offset: 0 });
    expect(second).toMatchObject({ total: 3, limit: 2, offset: 2 });
    expect([...bmisOf(first), ...bmisOf(second)]).toEqual([25, 22, 18.5]);
  });
});
