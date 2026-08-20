const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mqtt.gmarksoftware.com:1883', {
  username: 'admin',
  password: 'admin123'
});

client.on('connect', () => {
  console.log('Listening for all messages on # ...');
  client.subscribe('#');
  setTimeout(() => {
    client.end();
    console.log('Done listening.');
  }, 25000); // 25 seconds
});

let msgCount = 0;
client.on('message', (topic, message) => {
  const msgStr = message.toString();
  // Filter out typical large telemetry arrays to focus on short command messages
  if (msgStr.length < 250 && !msgStr.includes('timestamp')) {
    console.log(`\n[CAPTURED] Topic: ${topic}`);
    console.log(`Payload: ${msgStr}`);
  }
});
