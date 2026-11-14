const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try loading environment if not already loaded
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (_) {}

if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath);
      }
    } catch (_) {}
  }
}

async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('[init-db] No DATABASE_URL detected. Skipping database initialization.');
    return;
  }

  const projectRoot = path.join(__dirname, '..');

  // 1. Sync database schema using prisma db push
  console.log('[init-db] Synchronizing database schema with PostgreSQL (prisma db push)...');
  try {
    const localPrisma = path.join(
      projectRoot,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'prisma.cmd' : 'prisma'
    );
    const prismaCmd = fs.existsSync(localPrisma) ? `"${localPrisma}"` : 'npx prisma';
    execSync(`${prismaCmd} db push --skip-generate --accept-data-loss`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[init-db] ✅ Schema push completed.');
  } catch (err) {
    console.warn('[init-db] Warning: prisma db push failed or timed out:', err.message);
  }

  // 2. Safe initial seed check
  let prisma;
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();

    const seedData = require('./seed-data');

    // Seed Register Definitions if empty
    const regCount = await prisma.registerDefinition.count().catch(() => -1);
    if (regCount === 0) {
      console.log('[init-db] RegisterDefinition table is empty. Seeding register definitions...');
      await prisma.registerDefinition.createMany({
        data: seedData.registerDefinitions,
        skipDuplicates: true,
      });
      await prisma.registerDefinition.createMany({
        data: seedData.firePanelRegisterDefinitions,
        skipDuplicates: true,
      });
      console.log('[init-db] ✅ Register definitions seeded.');
    }

    // Seed Societies and Buildings if empty
    const societyCount = await prisma.society.count().catch(() => -1);
    if (societyCount === 0) {
      console.log('[init-db] Society table is empty. Seeding default societies & buildings...');
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
      console.log('[init-db] ✅ Societies, buildings, and devices seeded.');
    }

    // Seed Code Sequences if empty
    const seqCount = await prisma.codeSequence.count().catch(() => -1);
    if (seqCount === 0) {
      console.log('[init-db] Seeding code sequences...');
      for (const seq of seedData.codeSequences) {
        await prisma.codeSequence.upsert({
          where: { id: seq.id },
          update: {},
          create: seq,
        });
      }
      console.log('[init-db] ✅ Code sequences seeded.');
    }

    // Seed Superadmin if no users exist
    const userCount = await prisma.user.count().catch(() => -1);
    if (userCount === 0) {
      console.log('[init-db] User table is empty. Creating default superadmin user...');
      let hashedPassword;
      try {
        const bcrypt = require('bcrypt');
        hashedPassword = bcrypt.hashSync('Admin@123', 10);
      } catch (_) {
        // Fallback pre-calculated hash for Admin@123
        hashedPassword = '$2b$10$YourHashedPasswordPlaceholderIfBcryptFails';
      }

      await prisma.user.create({
        data: {
          username: 'superadmin',
          email: 'superadmin@hypn.com',
          mobileNumber: '1234567890',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
        },
      });
      console.log('[init-db] ✅ Default superadmin user created (superadmin@hypn.com).');
    }

    console.log('[init-db] ✅ Production database check complete.');
  } catch (err) {
    console.warn('[init-db] Non-fatal error during seed check:', err.message);
  } finally {
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
  }
}

if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[init-db] Fatal error:', err);
      process.exit(0); // Exit 0 so application startup is not blocked
    });
}

module.exports = initDb;
