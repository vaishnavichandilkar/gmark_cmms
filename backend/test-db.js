const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { mainFacility: true } });
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email, mainFacilityId: u.mainFacilityId })));
  const mfs = await prisma.mainFacility.findMany();
  console.log("MainFacilities:", mfs.map(f => ({ id: f.id, code: f.mainFacilityCode, name: f.mainFacilityName })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
