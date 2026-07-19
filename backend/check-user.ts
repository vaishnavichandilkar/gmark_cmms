import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'superadmin@hypn.com' } });
  console.log("USER:", user);
}
main().finally(() => prisma.$disconnect());
