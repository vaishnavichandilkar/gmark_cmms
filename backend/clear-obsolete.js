const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.deviceRegisterValue.deleteMany({
    where: { deviceId: '2806202501' }
  });
  console.log('Cleared values:', result.count);
}
main().finally(() => prisma.$disconnect());
