const mqtt = require('mqtt');

console.log('Connecting to MQTT broker...');
const client = mqtt.connect('mqtt://mqtt.gmarksoftware.com:1883', {
  username: 'admin',
  password: 'admin123'
});

client.on('connect', () => {
  console.log('Connected successfully. Emitting a CRITICAL power fault to MAC: 20260508012...');
  
  // Register 5 maps to inputPowerFaultType. Value 5 means "No Power".
  const faultPayload = {
    registers: [
      { register: 5, value: 5 }
    ]
  };

  client.publish('AGC/SE-20260508012', JSON.stringify(faultPayload), (err) => {
    if (err) {
      console.error('Failed to publish fault:', err);
    } else {
      console.log('Fault generated successfully! It will stay active until you resolve it.');
    }
    client.end();
  });
});

client.on('error', (err) => {
  console.error('MQTT Error:', err);
  client.end();
});
