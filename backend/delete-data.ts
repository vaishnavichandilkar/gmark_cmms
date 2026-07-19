import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.facility.deleteMany({});
  console.log("Deleted all facilities");
}
main().catch(console.error).finally(() => prisma.$disconnect());
