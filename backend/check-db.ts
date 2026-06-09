import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vals = await prisma.deviceRegisterValue.findMany({ take: 5, include: { register: true } });
  console.log('DeviceRegisterValues:', vals);
  const states = await prisma.deviceState.findMany({ take: 2 });
  console.log('DeviceStates:', states);
}

main().finally(() => prisma.$disconnect());
