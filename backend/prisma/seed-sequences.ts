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

  // 4. Asset
  const astMachines = await prisma.machine.findMany({
    where: { assetCode: { startsWith: 'AST' } },
    select: { assetCode: true },
  });
  let astMax = 0;
  for (const m of astMachines) {
    if (m.assetCode) {
      const num = parseInt(m.assetCode.replace(/^\D+/, ''), 10);
      if (!isNaN(num) && num > astMax) {
        astMax = num;
      }
    }
  }
  await prisma.codeSequence.upsert({
    where: { id: 'ASSET' },
    update: { lastValue: astMax },
    create: {
      id: 'ASSET',
      prefix: 'AST',
      lastValue: astMax,
      padding: 3
    }
  });
  console.log(`ASSET sequence set to ${astMax}`);

  // 5. Machine
  const mchMachines = await prisma.machine.findMany({
    where: { machineCode: { startsWith: 'MCH' } },
    select: { machineCode: true },
  });
  let mchMax = 0;
  for (const m of mchMachines) {
    if (m.machineCode) {
      const num = parseInt(m.machineCode.replace(/^\D+/, ''), 10);
      if (!isNaN(num) && num > mchMax) {
        mchMax = num;
      }
    }
  }
  await prisma.codeSequence.upsert({
    where: { id: 'MACHINE' },
    update: { lastValue: mchMax },
    create: {
      id: 'MACHINE',
      prefix: 'MCH',
      lastValue: mchMax,
      padding: 3
    }
  });
  console.log(`MACHINE sequence set to ${mchMax}`);

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
