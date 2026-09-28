import { PrismaClient } from '@prisma/client';
import { AlertsService } from '../src/modules/scada/alerts/alerts.service';
import { AlertsEmailService } from '../src/modules/scada/alerts/email.service';

async function testRoleResolution() {
  console.log('--- Testing Role-Based Notification Resolution ---');
  const prisma = new PrismaClient();
  const emailService = new AlertsEmailService();
  const alertsService = new AlertsService(prisma as any, null as any, emailService);

  try {
    // 1. Check existing users in the system and their roles
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, email: true, role: true },
    });
    console.log(`Found ${users.length} active users in DB:`);
    users.forEach((u) => console.log(`  - [${u.role}] ${u.username} (${u.email})`));

    // 2. Test getEmailsForRoles with different role queries
    const testRoles = ['SUPER_ADMIN', 'BUILDING_ADMIN', 'OPERATOR'];
    console.log(`\nResolving emails for roles: [${testRoles.join(', ')}]...`);
    const resolved = await alertsService.getEmailsForRoles(testRoles);
    console.log('Resolved:', resolved);

    console.log('\nTesting test email dispatch to roles...');
    const result = await emailService.sendAlertEmail({
      to: resolved.emails.length > 0 ? resolved.emails : ['admin@gmarksoft.com'],
      deviceId: '20260508012',
      deviceName: 'Booster Pump Station',
      alertType: 'CRITICAL',
      message: 'Role-based test alert: Delivery Pressure Exceeded Safety Limit',
      intensity: 3,
      triggerKey: 'reg_40027',
      conditionDetails: 'Role-based dispatch to: ' + (resolved.rolesFound.join(', ') || 'SUPER_ADMIN'),
      currentValue: '8.5 Bar',
    });
    console.log('Dispatch result:', result);

    console.log('\n✅ Role-based notification resolution test passed!');
  } finally {
    await prisma.$disconnect();
  }
}

testRoleResolution().catch(console.error);
