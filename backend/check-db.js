const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { email: 'vaishnavichandilkar26@gmail.com' }
  });

  if (adminUser) {
    console.log(`Setting adminId = ${adminUser.id} for Vaishnavi Chandilkar admin account.`);
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { adminId: adminUser.id }
    });

    const empCount = await prisma.employee.updateMany({
      data: { adminId: adminUser.id }
    });
    console.log(`Assigned ${empCount.count} employees to adminId ${adminUser.id}`);
  }

  // Ensure all SUPER_ADMIN and SOCIETY_ADMIN users have adminId = self id if null
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['SUPER_ADMIN', 'SOCIETY_ADMIN'] }
    }
  });

  for (const admin of admins) {
    if (!admin.adminId) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { adminId: admin.id }
      });
      console.log(`Set adminId = ${admin.id} for admin user ${admin.username}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
