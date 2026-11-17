const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
  }
} catch (_) {}

const prisma = new PrismaClient();

async function resetDb() {
  console.log('[reset-db] Connecting to database...');

  const tablesToTruncate = [
    'DeviceRegisterValue',
    'RegisterDefinition',
    'Device',
    'Building',
    'DeviceState',
    'DeviceSnapshot',
    'Society',
    'User',
    'UserBuilding',
    'AuditLog',
    'SparePartMaster',
    'Supplier',
    'WorkOrder',
    'WorkOrderMedia',
    'WorkOrderSparePart',
    'WorkOrderRevision',
    'MaintenanceSchedule',
    'MaintenanceScheduleTask',
    'MaintenanceScheduleSpare',
    'MaintenanceScheduleLog',
    'CheckpointMaster',
    'UserCheckpoint',
    'MachineCheckpoint',
    'MachineDocument',
    'MachineSpecification',
    'Machine',
    'Facility',
    'MainFacility',
    'Employee',
    'CodeSequence',
    'Designation',
    'Permission',
    'UserPermission',
    'Registration',
    'DeviceAlert',
    'RegisterAlertConfig',
    'MachineOption'
  ];

  console.log('[reset-db] Truncating tables with CASCADE...');
  const quotedTables = tablesToTruncate.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} CASCADE;`);
  console.log('[reset-db] ✅ Tables truncated successfully.');

  // Load default seeds
  const seedData = require('./seed-data');

  console.log('[reset-db] Seeding default societies, buildings, and devices...');
  await prisma.society.createMany({
    data: seedData.societies,
    skipDuplicates: true,
  });
  await prisma.building.createMany({
    data: seedData.buildings,
    skipDuplicates: true,
  });
  await prisma.device.createMany({
    data: seedData.devices,
    skipDuplicates: true,
  });

  console.log('[reset-db] Seeding register definitions...');
  await prisma.registerDefinition.createMany({
    data: seedData.registerDefinitions,
    skipDuplicates: true,
  });
  await prisma.registerDefinition.createMany({
    data: seedData.firePanelRegisterDefinitions,
    skipDuplicates: true,
  });

  console.log('[reset-db] Seeding code sequences...');
  for (const seq of seedData.codeSequences) {
    await prisma.codeSequence.upsert({
      where: { id: seq.id },
      update: { lastValue: 0 },
      create: seq,
    });
  }

  console.log('[reset-db] Seeding default superadmin user...');
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync('Admin@123', salt);

  await prisma.user.create({
    data: {
      username: 'superadmin',
      email: 'superadmin@hypn.com',
      mobileNumber: '1234567890',
      password: hashedPassword,
      plainPassword: 'Admin@123',
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });

  console.log('[reset-db] Resetting autoincrement sequences...');
  const serialTables = [
    'Society',
    'Building',
    'Device',
    'User',
    'Employee',
    'Registration',
    'MainFacility',
    'Facility',
    'Machine',
    'SparePartMaster',
    'Supplier',
    'WorkOrder',
    'MaintenanceSchedule',
    'CheckpointMaster',
    'AuditLog',
    'UserBuilding'
  ];

  for (const table of serialTables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce((SELECT MAX(id) FROM "${table}"), 1), false);`
      );
    } catch (_) {}
  }

  console.log('[reset-db] ✅ Database reset and initial seed complete!');
}

resetDb()
  .catch((err) => {
    console.error('[reset-db] Error resetting database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
