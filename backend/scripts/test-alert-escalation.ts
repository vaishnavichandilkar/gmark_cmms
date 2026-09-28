import { PrismaClient } from '@prisma/client';
import { AlertsService } from '../src/modules/scada/alerts/alerts.service';
import { AlertsEmailService } from '../src/modules/scada/alerts/email.service';
import { AlertsEscalationService } from '../src/modules/scada/alerts/alerts-escalation.service';

async function testAlertEscalationFlow() {
  console.log('===========================================================');
  console.log('🧪 TESTING TIERED ALERT ESCALATION MATRIX (LEVEL 1 -> 2 -> 3)');
  console.log('===========================================================\n');

  const prisma = new PrismaClient();
  const emailService = new AlertsEmailService();
  const mockWebsocketGateway: any = {
    server: {
      emit: (ev: string, data: any) => console.log(`   [WS BROADCAST] Event: ${ev}, Device: ${data.deviceId}, Level: ${data.escalationLevel}`),
      to: () => ({ emit: () => {} }),
    },
  };
  const alertsService = new AlertsService(prisma as any, mockWebsocketGateway, emailService);
  const escalationService = new AlertsEscalationService(prisma as any, mockWebsocketGateway, emailService);

  let testAlertId: number | null = null;

  try {
    // 1. Verify Users & Roles
    console.log('1. Checking system user roles for escalation chain...');
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, email: true, role: true },
    });
    console.log(`   Found ${users.length} active users:`);
    users.forEach((u) => console.log(`   - [${u.role}] ${u.username} (${u.email})`));

    // 2. Find an existing device in the database or create one if necessary
    let device = await prisma.device.findFirst();
    if (!device) {
      device = await prisma.device.create({
        data: {
          deviceId: 'TEST_DEVICE_01',
          name: 'Primary Booster Station',
        },
      });
    }
    const testDeviceId = device.deviceId;
    console.log(`\n2. Using Device: ${device.name || testDeviceId} (ID: ${testDeviceId})`);

    // 3. Setup Alert Config with Escalation
    console.log('   Ensuring alert configuration with tiered escalation enabled...');
    const config = await prisma.registerAlertConfig.upsert({
      where: {
        deviceId_registerNumber: {
          deviceId: testDeviceId,
          registerNumber: 40099,
        },
      },
      update: {
        enableEscalation: true,
        escalationIntervalMinutes: 60,
        escalationChain: 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN',
        notifyRoles: 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN',
        enabled: true,
      },
      create: {
        deviceId: testDeviceId,
        registerNumber: 40099,
        alertType: 'CRITICAL',
        conditionType: 'GREATER_THAN',
        conditionValue: 7.0,
        message: 'Discharge Pressure Exceeded Safety Limit',
        enableEscalation: true,
        escalationIntervalMinutes: 60,
        escalationChain: 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN',
        notifyRoles: 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN',
        enabled: true,
        intensity: 2,
      },
    });
    console.log(`   Config saved: Escalation=${config.enableEscalation}, Interval=${config.escalationIntervalMinutes}m, Chain=[${config.escalationChain}]`);

    // 4. Create simulated Level 1 Alert (initially routed to Operator)
    console.log('\n3. Generating Tier 1 alert (Routing initially to Operator)...');
    const createdAlert = await prisma.deviceAlert.create({
      data: {
        deviceId: testDeviceId,
        type: 'CRITICAL',
        message: 'Booster Pump 1 Discharge Pressure Critical: 9.8 Bar (Limit 7.0 Bar)',
        triggerKey: 'reg_40099',
        status: 'ACTIVE',
        escalationLevel: 1,
        isEscalated: false,
        emailSent: true,
        rolesNotified: 'OPERATOR',
      },
    });
    testAlertId = createdAlert.id;
    console.log(`   Alert #${createdAlert.id} created.`);
    console.log(`   Initial State: Level=${createdAlert.escalationLevel}, Status=${createdAlert.status}, RolesNotified=[${createdAlert.rolesNotified}]`);

    // 5. Simulate Elapsed Interval -> Escalate to Tier 2 (Building Admin)
    console.log('\n4. Simulating time duration elapsed without operator acknowledgment...');
    console.log('   Executing escalation service evaluation (forceEscalate=true)...');
    const alertRecordTier1 = await prisma.deviceAlert.findUnique({
      where: { id: testAlertId },
      include: { device: true },
    });
    const escalatedTier2 = await escalationService.evaluateAlertForEscalation(alertRecordTier1!, true);

    if (escalatedTier2) {
      const refreshedTier2 = await prisma.deviceAlert.findUnique({ where: { id: testAlertId } });
      console.log(`   ✅ Successfully Escalated to Tier 2!`);
      console.log(`      Level: ${refreshedTier2?.escalationLevel}`);
      console.log(`      isEscalated: ${refreshedTier2?.isEscalated}`);
      console.log(`      Last Escalated At: ${refreshedTier2?.lastEscalatedAt}`);
      console.log(`      Roles Notified: [${refreshedTier2?.rolesNotified}]`);
    } else {
      throw new Error('Tier 2 escalation evaluation failed!');
    }

    // 6. Simulate Elapsed Interval -> Escalate to Tier 3 (Super Admin)
    console.log('\n5. Simulating second duration elapsed without acknowledgment...');
    console.log('   Executing escalation service evaluation (forceEscalate=true)...');
    const alertRecordTier2 = await prisma.deviceAlert.findUnique({
      where: { id: testAlertId },
      include: { device: true },
    });
    const escalatedTier3 = await escalationService.evaluateAlertForEscalation(alertRecordTier2!, true);

    if (escalatedTier3) {
      const refreshedTier3 = await prisma.deviceAlert.findUnique({ where: { id: testAlertId } });
      console.log(`   ✅ Successfully Escalated to Tier 3!`);
      console.log(`      Level: ${refreshedTier3?.escalationLevel}`);
      console.log(`      isEscalated: ${refreshedTier3?.isEscalated}`);
      console.log(`      Last Escalated At: ${refreshedTier3?.lastEscalatedAt}`);
      console.log(`      Roles Notified: [${refreshedTier3?.rolesNotified}]`);
    } else {
      throw new Error('Tier 3 escalation evaluation failed!');
    }

    // 7. Test Acknowledgment by Operator / Head
    console.log('\n6. Testing Alert Acknowledgment...');
    const ackResult = await prisma.deviceAlert.update({
      where: { id: testAlertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: 'Lead Operator John',
      },
    });
    console.log(`   Alert #${testAlertId} acknowledged by: ${ackResult.acknowledgedBy} at ${ackResult.acknowledgedAt}`);

    // 8. Verify that Escalation is HALTED after Acknowledgment
    console.log('\n7. Verifying that further escalation attempts are halted once acknowledged...');
    const alertRecordAck = await prisma.deviceAlert.findUnique({
      where: { id: testAlertId },
      include: { device: true },
    });
    const haltedResult = await escalationService.evaluateAlertForEscalation(alertRecordAck!, true);
    console.log(`   Escalation evaluation after acknowledgment returned: ${haltedResult} (Expected: null)`);
    if (haltedResult === null) {
      console.log('   ✅ Escalation successfully HALTED! No further emails will be sent to upper management.');
    } else {
      throw new Error('Escalation did not halt after acknowledgment!');
    }

    console.log('\n===========================================================');
    console.log('🎉 ALL TIERED ESCALATION TESTS PASSED 100% SUCCESSFULLY!');
    console.log('===========================================================');
  } catch (error) {
    console.error('❌ Escalation test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup test data
    if (testAlertId) {
      await prisma.deviceAlert.deleteMany({ where: { id: testAlertId } });
    }
    await prisma.registerAlertConfig.deleteMany({
      where: {
        registerNumber: 40099,
      },
    });
    await prisma.$disconnect();
  }
}

testAlertEscalationFlow();
