const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const device = await prisma.device.findUnique({
    where: { deviceId: "20260508012" }
  });
  console.log("Device found:", device);
}
check();
