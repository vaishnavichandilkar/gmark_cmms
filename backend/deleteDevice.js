const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.device.deleteMany();
  console.log('Deleted all devices');
}
main().catch(console.error).finally(() => prisma.$disconnect());
