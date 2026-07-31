import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding code sequences...');

  // 1. Employee
  const lastEmployee = await prisma.employee.findFirst({
    orderBy: { id: 'desc' },
  });
  let empMax = 0;
  if (lastEmployee && lastEmployee.employeeCode) {
    const match = lastEmployee.employeeCode.match(/\d+$/);
    if (match) {
      empMax = parseInt(match[0], 10);
    }
  }
  await prisma.codeSequence.upsert({
    where: { id: 'EMPLOYEE' },
    update: { lastValue: empMax },
    create: {
      id: 'EMPLOYEE',
      prefix: 'E',
      lastValue: empMax,
      padding: 3
    }
  });
  console.log(`EMPLOYEE sequence set to ${empMax}`);

  // 2. Main Facility
  const lastMainFacility = await prisma.mainFacility.findFirst({
    orderBy: { id: 'desc' },
  });
  let mfMax = 0;
  if (lastMainFacility && lastMainFacility.mainFacilityCode) {
    const match = lastMainFacility.mainFacilityCode.match(/\d+$/);
    if (match) {
      mfMax = parseInt(match[0], 10);
    }
  }
  await prisma.codeSequence.upsert({
    where: { id: 'MAIN_FACILITY' },
    update: { lastValue: mfMax },
    create: {
      id: 'MAIN_FACILITY',
      prefix: 'MF',
      lastValue: mfMax,
      padding: 3
    }
  });
  console.log(`MAIN_FACILITY sequence set to ${mfMax}`);

  // 3. Facility
  const lastFacility = await prisma.facility.findFirst({
    orderBy: { id: 'desc' },
  });
  let fMax = 0;
  if (lastFacility && lastFacility.facilityCode) {
    const match = lastFacility.facilityCode.match(/\d+$/);
    if (match) {
      fMax = parseInt(match[0], 10);
    }
  }
  await prisma.codeSequence.upsert({
    where: { id: 'FACILITY' },
    update: { lastValue: fMax },
    create: {
      id: 'FACILITY',
      prefix: 'FL',
      lastValue: fMax,
      padding: 3
    }
  });
  console.log(`FACILITY sequence set to ${fMax}`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
