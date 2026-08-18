const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const defs = await prisma.registerDefinition.findMany({
    where: { address: { in: [164, 40164] } }
  });
  console.log("Register Definitions:", defs);
  
  const values = await prisma.deviceRegisterValue.findMany({
    where: { deviceId: '2806202501' },
    include: { register: true }
  });
  console.log("Device Values mapped:");
  for(let v of values) {
    if([164, 40164].includes(v.register.address)) {
      console.log(`Address ${v.register.address}: ${v.value}`);
    }
  }
}
main().finally(() => prisma.$disconnect());
