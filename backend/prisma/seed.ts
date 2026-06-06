import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.device.deleteMany();
  await prisma.building.deleteMany();

  console.log('Seeding buildings...');
  const buildings = await prisma.building.createMany({
    data: [
      { id: 1, name: 'A Building' },
      { id: 2, name: 'B Building' },
      { id: 3, name: 'C Building' },
      { id: 4, name: 'STP' },
    ],
  });

  console.log('Seeding devices...');

  const devices = [
    // A BUILDING
    { deviceId: '20260508012', name: 'Flushing Terrace Booster System', buildingId: 1, template: 'booster', systemName: 'Flushing Terrace Booster System', cardNo: '06' },
    { deviceId: '20260508045', name: 'Domestic Terrace Booster System', buildingId: 1, template: 'booster', systemName: 'Domestic Terrace Booster System', cardNo: '05' },

    // B BUILDING
    { deviceId: '2026051104', name: 'Sump Pump-05', buildingId: 2 },
    { deviceId: '20260506027', name: 'Sump Pump-06', buildingId: 2 },
    { deviceId: '20260506023', name: 'Sump Pump-03', buildingId: 2 },
    { deviceId: '20260506029', name: 'Sump Pump-02', buildingId: 2 },
    { deviceId: '20260506030', name: 'Sump Pump-01', buildingId: 2 },
    { deviceId: '2026050913', name: 'Sump Pump-04', buildingId: 2 },
    { deviceId: '2026050907', name: 'Sub Soil Pump-03', buildingId: 2 },
    { deviceId: '2026050909', name: 'Sub Soil Pump-04', buildingId: 2 },
    { deviceId: '202605034', name: 'Sub Soil Pump-02', buildingId: 2 },
    { deviceId: '20260508013', name: 'Tower B Domestic System', buildingId: 2, template: 'booster', systemName: 'Tower B Domestic System', cardNo: '04' },
    { deviceId: '20260526020', name: 'Tower A&C Domestic System', buildingId: 2 },
    { deviceId: '2026050805', name: 'Flushing Terrace Booster System', buildingId: 2, template: 'booster', systemName: 'Flushing Terrace Booster System', cardNo: '06' },
    { deviceId: '20260508011', name: 'Domestic Terrace Booster System', buildingId: 2, template: 'booster', systemName: 'Domestic Terrace Booster System', cardNo: '05' },

    // C BUILDING - 10 devices
    { deviceId: '2026050910', name: 'C Building Pump 1', buildingId: 3 },
    { deviceId: '2026050904', name: 'C Building Pump 2', buildingId: 3 },
    { deviceId: '2026050902', name: 'C Building Pump 3', buildingId: 3 },
    { deviceId: '2026051111', name: 'C Building Pump 4', buildingId: 3 },
    { deviceId: '20260506036', name: 'C Building Pump 5', buildingId: 3 },
    { deviceId: '2026051127', name: 'C Building Pump 6', buildingId: 3 },
    { deviceId: '2026051115', name: 'C Building Pump 7', buildingId: 3 },
    { deviceId: '2026051133', name: 'C Building Pump 8', buildingId: 3 },
    { deviceId: '20260508010', name: 'C Building Pump 9', buildingId: 3, template: 'booster', systemName: 'Flushing Terrace Booster System', cardNo: '02' },
    { deviceId: '20260526021', name: 'C Building Pump 10', buildingId: 3 },

    // STP - 4 devices
    { deviceId: '2026050901', name: 'Sub Soil Pump-01', buildingId: 4 },
    { deviceId: '20260223035', name: 'STP Pump 2', buildingId: 4 },
    { deviceId: '2026052022', name: 'STP Pump 3', buildingId: 4 },
    { deviceId: '2026526023', name: 'STP Pump 4', buildingId: 4 },
  ];

  await prisma.device.createMany({
    data: devices.map(d => ({
      ...d,
      topic: `AGC/SE${d.deviceId}`
    })),
  });

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
