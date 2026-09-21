const mqtt = require('mqtt');

console.log('Connecting to MQTT broker...');
const client = mqtt.connect('mqtt://mqtt.gmarksoftware.com:1883', {
  username: 'admin',
  password: 'admin123'
});

client.on('connect', () => {
  console.log('Connected successfully. Emitting a POWER OK signal to MAC: 20260508012...');
  
  // Register 5 maps to inputPowerFaultType. Value 0 means "Power OK".
  const resolvePayload = {
    registers: [
      { register: 5, value: 0 }
    ]
  };

  client.publish('AGC/SE-20260508012', JSON.stringify(resolvePayload), (err) => {
    if (err) {
      console.error('Failed to publish resolve signal:', err);
    } else {
      console.log('Fault resolved successfully!');
    }
    client.end();
  });
});

client.on('error', (err) => {
  console.error('MQTT Error:', err);
  client.end();
});
