// Sample participants for the dev database. Run by `prisma db seed` (root `pnpm dev` does that after migrating).
// Each row goes through the shared create schema and the server BMI, so it obeys the same rules as one staff enter.
// Re-runnable: email and phone are unique, so rows already present are skipped and nothing is overwritten.
import { existsSync } from 'node:fs';
import { createParticipantSchema } from '@curebase/shared';
import { bmi } from '../src/participants/bmi.js';
import { PrismaService } from '../src/prisma.service.js';

if (existsSync('.env')) process.loadEnvFile();

// [name, date of birth, weight, weight unit, height, height unit]: a mix of units and a BMI spread of about 17 to 38.
const people = [
  ['Ada Moreno', '1988-03-14', 62, 'kg', 168, 'cm'],
  ['Bilal Haddad', '1975-11-02', 210, 'lb', 70, 'in'],
  ['Chen Wei', '1992-07-21', 54, 'kg', 172, 'cm'],
  ['Dana Okafor', '1969-01-30', 95, 'kg', 165, 'cm'],
  ['Elif Kaya', '2001-09-09', 128, 'lb', 64, 'in'],
  ['Farid Rahimi', '1984-05-17', 78, 'kg', 180, 'cm'],
  ['Grace Lindqvist', '1958-12-25', 71, 'kg', 160, 'cm'],
  ['Hiro Tanaka', '1995-04-03', 150, 'lb', 175, 'cm'],
  ['Isla McKenzie', '1979-08-11', 49, 'kg', 63, 'in'],
  ['Jonas Becker', '1966-02-19', 118, 'kg', 183, 'cm'],
  ['Kavya Iyer', '1990-10-27', 132, 'lb', 158, 'cm'],
  ['Luca Romano', '1983-06-06', 84, 'kg', 71, 'in'],
  ['Maya Cohen', '1998-12-01', 58, 'kg', 166, 'cm'],
  ['Nikolai Petrov', '1972-03-28', 245, 'lb', 72, 'in'],
  ['Olivia Brooks', '1987-07-15', 67, 'kg', 162, 'cm'],
  ['Pedro Alves', '1961-09-04', 88, 'kg', 170, 'cm'],
  ['Quinn Harper', '2003-01-22', 115, 'lb', 67, 'in'],
  ['Rania Saleh', '1993-05-30', 76, 'kg', 159, 'cm'],
  ['Sven Larsen', '1977-11-18', 92, 'kg', 191, 'cm'],
  ['Tamar Levi', '1985-02-07', 145, 'lb', 61, 'in'],
  ['Uche Nwosu', '1970-08-24', 101, 'kg', 178, 'cm'],
  ['Valentina Cruz', '1996-04-12', 52, 'kg', 155, 'cm'],
  ['Wen Li', '1964-10-05', 170, 'lb', 66, 'in'],
  ['Ximena Ortiz', '1989-06-29', 81, 'kg', 174, 'cm'],
  ['Yusuf Demir', '1980-12-13', 108, 'kg', 169, 'cm'],
] as const;

// 555-0100 to 555-0199 are reserved for fiction in North America, yet valid, so no seed number reaches a real person.
const areaCodes = ['202', '212', '312', '415', '617'];

const now = Date.now();
const data = people.map(([name, dateOfBirth, weight, weightUnit, height, heightUnit], i) => {
  const participant = createParticipantSchema.parse({
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    phone: `+1${areaCodes[i % areaCodes.length]}55501${String(i).padStart(2, '0')}`,
    dateOfBirth,
    weight,
    weightUnit,
    height,
    heightUnit,
  });
  // A minute apart, so the newest-first list shows them in a stable, readable order.
  return { ...participant, bmi: bmi(participant), createdAt: new Date(now - i * 60_000) };
});

const prisma = new PrismaService();
try {
  const { count } = await prisma.participant.createMany({ data, skipDuplicates: true });
  console.log(`Seeded ${count} new participants (${data.length - count} already present).`);
} finally {
  await prisma.$disconnect();
}
