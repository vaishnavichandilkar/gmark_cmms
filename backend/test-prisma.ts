import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { username: 'vallabh.ghatge' }});
  console.log('User:', user.username, 'mainFacilityId:', user.mainFacilityId, 'role:', user.role);
  
  const machines = await prisma.machine.findMany({
    where: { facility: { mainFacilityId: user.mainFacilityId } },
    include: { facility: true }
  });
  console.log('Machines found for this user:', machines.length);
  console.log(machines);
}
main().catch(console.error).finally(() => prisma.$disconnect());
