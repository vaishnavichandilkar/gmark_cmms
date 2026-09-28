import { AlertsEmailService } from '../src/modules/scada/alerts/email.service';

async function testEmail() {
  console.log('--- Testing AlertsEmailService ---');
  const service = new AlertsEmailService();
  console.log('Status:', service.getStatus());

  console.log('\nSending test alert email to "test-operator@gmarksoft.com"...');
  const result = await service.sendTestEmail('test-operator@gmarksoft.com', '20260508012');
  console.log('Result:', result);

  console.log('\nSending simulated CRITICAL alert email...');
  const alertResult = await service.sendAlertEmail({
    to: ['engineer@plant.com', 'manager@gmarksoft.com'],
    deviceId: '20260508012',
    deviceName: 'WMP Booster Pump Station #1',
    alertType: 'CRITICAL',
    message: 'High Delivery Pressure Limit Exceeded (8.5 Bar)',
    intensity: 4,
    triggerKey: 'reg_40027',
    conditionDetails: 'Pressure Bar > 7.0 Bar',
    currentValue: '8.5 Bar',
  });
  console.log('Alert Email Result:', alertResult);
  console.log('\n✅ AlertsEmailService test completed successfully!');
}

testEmail().catch(console.error);
