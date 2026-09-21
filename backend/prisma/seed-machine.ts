import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Machine for Machine Management...');

  // Find or use building 1
  const building = await prisma.building.findFirst();
  const buildingId = building ? building.id : null;

  // Check if device 20260508012 exists or pick first device
  const device = await prisma.device.findFirst({
    where: { deviceId: '20260508012' },
  });
  const deviceId = device ? device.deviceId : '20260508012';

  // Upsert the machine
  const machine = await prisma.machine.upsert({
    where: { deviceId },
    update: {
      name: 'Flushing Terrace Booster System',
      machineCode: 'MCH-BST-001',
      company: 'Gmark Software Pvt Ltd',
      make: 'Grundfos / Hydro Multi-E',
      modelNumber: 'CME 5-4 A-R-A-E-A-QQBE',
      machineCategory: 'Pumping System',
      machineSubCategory: 'Booster Pump Set',
      description: 'High-pressure multi-stage booster pump system for building flushing line water distribution with live SCADA telemetry.',
      assetCode: 'AST-BST-2026-01',
      costCenter: 'CC-PLANT-01',
      headOfDepartment: 'Operations & Maintenance',
      machineOwner: 'Super Admin',
      maintenanceHead: 'Super Admin',
      buildingId,
      notes: 'Equipped with 4 multi-stage pumps, pressure transmitter, and automatic VFD panel. Linked to IoT Gateway 20260508012.',
    },
    create: {
      name: 'Flushing Terrace Booster System',
      deviceId,
      machineCode: 'MCH-BST-001',
      company: 'Gmark Software Pvt Ltd',
      make: 'Grundfos / Hydro Multi-E',
      modelNumber: 'CME 5-4 A-R-A-E-A-QQBE',
      machineCategory: 'Pumping System',
      machineSubCategory: 'Booster Pump Set',
      description: 'High-pressure multi-stage booster pump system for building flushing line water distribution with live SCADA telemetry.',
      assetCode: 'AST-BST-2026-01',
      costCenter: 'CC-PLANT-01',
      headOfDepartment: 'Operations & Maintenance',
      machineOwner: 'Super Admin',
      maintenanceHead: 'Super Admin',
      buildingId,
      notes: 'Equipped with 4 multi-stage pumps, pressure transmitter, and automatic VFD panel. Linked to IoT Gateway 20260508012.',
      specifications: {
        create: [
          { title: 'Rated Discharge Flow', inputType: 'number', data: '25', unit: 'm³/h' },
          { title: 'Design Head Pressure', inputType: 'number', data: '6.5', unit: 'bar' },
          { title: 'Total Motor Power', inputType: 'number', data: '5.5', unit: 'kW' },
          { title: 'Operating Supply Voltage', inputType: 'number', data: '415', unit: 'V' },
          { title: 'Full Load Current (FLC)', inputType: 'number', data: '12.5', unit: 'A' },
          { title: 'Number of Pumps', inputType: 'number', data: '4', unit: 'units' },
        ],
      },
    },
  });

  console.log(`✅ Successfully seeded Machine:`);
  console.log(`   ID: ${machine.id}`);
  console.log(`   Name: ${machine.name}`);
  console.log(`   Machine Code: ${machine.machineCode}`);
  console.log(`   Device ID (IoT Link): ${machine.deviceId}`);
  console.log(`   Building ID: ${machine.buildingId}`);
  console.log(`   Category: ${machine.machineCategory}`);
  console.log(`   Make / Model: ${machine.make} / ${machine.modelNumber}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding machine:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
