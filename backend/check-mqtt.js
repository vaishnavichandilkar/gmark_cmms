const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const snapshot = await prisma.deviceSnapshot.findFirst({
    where: { deviceId: '2806202501' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(snapshot.payload);
}
main().finally(() => prisma.$disconnect());
