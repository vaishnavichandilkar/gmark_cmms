const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const device = await prisma.device.findUnique({ where: { deviceId: '53438D' } });
  console.log("Device exists:", !!device);
  prisma.$disconnect();
}
main();
