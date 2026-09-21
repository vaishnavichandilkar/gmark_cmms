#!/usr/bin/env node

/**
 * SCADA Live Alert & Telemetry Simulator
 * 
 * Usage:
 *   node backend/scripts/simulate-telemetry.js --demo
 *   node backend/scripts/simulate-telemetry.js --device 20260508012 --reg 40027 --val 8.5
 *   node backend/scripts/simulate-telemetry.js --device 20260508012 --reg 40027 --val 4.0
 */

const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://mqtt.gmarksoftware.com:1883';
const OPTIONS = {
  username: 'admin',
  password: 'admin123',
};

const args = process.argv.slice(2);
let deviceId = '20260508012';
let register = 40027; // Pressure Bar Value (or reg 27)
let value = 8.5;
let isDemo = false;
let pump = null;
let action = null;
let mode = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--device' && args[i + 1]) deviceId = args[++i];
  if ((args[i] === '--reg' || args[i] === '--register') && args[i + 1]) register = Number(args[++i]);
  if ((args[i] === '--val' || args[i] === '--value') && args[i + 1]) value = Number(args[++i]);
  if (args[i] === '--demo') isDemo = true;
  if (args[i] === '--pump' && args[i + 1]) pump = Number(args[++i]);
  if (args[i] === '--action' && args[i + 1]) action = args[++i].toLowerCase();
  if (args[i] === '--mode' && args[i + 1]) mode = args[++i].toUpperCase();
}

const client = mqtt.connect(BROKER_URL, OPTIONS);

client.on('connect', () => {
  console.log(`\n🔗 Connected to MQTT Broker (${BROKER_URL})`);
  const topic = `AGC/SE-${deviceId}`;

  if (pump !== null) {
    if (mode !== null) {
      const modeReg = 40037 + pump;
      const modeVal = mode === 'AUTO' ? 1 : mode === 'MANUAL' ? 22 : 2;
      console.log(`\n⚙️ Simulating Pump ${pump} MODE SWITCH to ${mode} (Reg: ${modeReg}, Value: ${modeVal}) for Device: ${deviceId}`);
      const payload = JSON.stringify({
        registers: [
          { register: modeReg, value: modeVal },
          { register: modeReg - 40000, value: modeVal },
        ]
      });
      client.publish(topic, payload, (err) => {
        if (err) {
          console.error('❌ Failed to publish:', err.message);
        } else {
          console.log(`✅ Pump ${pump} Mode successfully set to ${mode} on MQTT broker!`);
        }
        client.end();
      });
      return;
    }
    const isStart = action === 'start' || action === 'on' || action === '1';
    const statusReg = 40000 + pump;
    const rCurrReg = 40010 + (pump - 1) * 3;
    const yCurrReg = 40011 + (pump - 1) * 3;
    const bCurrReg = 40012 + (pump - 1) * 3;

    console.log(`\n⚙️ Simulating Pump ${pump} ${isStart ? 'START' : 'STOP'} for Device: ${deviceId}`);
    const payload = JSON.stringify({
      registers: [
        { register: statusReg, value: isStart ? 1 : 0 },
        { register: statusReg - 40000, value: isStart ? 1 : 0 },
        { register: rCurrReg, value: isStart ? 12.4 : 0 },
        { register: rCurrReg - 40000, value: isStart ? 12.4 : 0 },
        { register: yCurrReg, value: isStart ? 12.1 : 0 },
        { register: yCurrReg - 40000, value: isStart ? 12.1 : 0 },
        { register: bCurrReg, value: isStart ? 12.5 : 0 },
        { register: bCurrReg - 40000, value: isStart ? 12.5 : 0 },
        { register: 40027, value: isStart ? 4.2 : 2.1 },
        { register: 27, value: isStart ? 4.2 : 2.1 },
      ]
    });

    console.log(`📤 Publishing to Topic: ${topic}`);
    client.publish(topic, payload, (err) => {
      if (err) {
        console.error('❌ Failed to publish:', err.message);
      } else {
        console.log(`✅ Pump ${pump} successfully set to ${isStart ? 'RUNNING (with 12.4A load & 4.2 bar)' : 'STOPPED (0A load)'}!`);
        console.log(`👀 Check your Booster Dashboard: Watch the pump and pipes update live!`);
      }
      client.end();
    });
    return;
  }

  if (isDemo) {
    console.log(`\n🎬 Starting LIVE DEMO for Device: ${deviceId}`);
    console.log(`--------------------------------------------------`);
    console.log(`Step 1: Publishing HIGH breach value (value: 8.5 bar) to trigger ALERT...`);

    const breachPayload = JSON.stringify({
      registers: [
        { register: register, value: 8.5 },
        { register: register >= 40000 ? register - 40000 : register, value: 8.5 },
      ],
    });

    client.publish(topic, breachPayload, () => {
      console.log(`🚨 [PUBLISHED] Alert Breach Packet -> Topic: ${topic}`);
      console.log(`👀 Check your browser: You should see the Toast & pulsating Red Card!`);
      console.log(`⏳ Waiting 7 seconds before simulating recovery...`);

      setTimeout(() => {
        console.log(`\nStep 2: Publishing NORMAL recovery value (value: 3.8 bar)...`);
        const normalPayload = JSON.stringify({
          registers: [
            { register: register, value: 3.8 },
            { register: register >= 40000 ? register - 40000 : register, value: 3.8 },
          ],
        });

        client.publish(topic, normalPayload, () => {
          console.log(`✅ [PUBLISHED] Recovery Packet -> Topic: ${topic}`);
          console.log(`👀 Check your browser: You should see the green "Alert Resolved" Toast!`);
          console.log(`--------------------------------------------------\n`);
          client.end();
        });
      }, 7000);
    });
  } else {
    const payload = JSON.stringify({
      registers: [
        { register: register, value: value },
        { register: register >= 40000 ? register - 40000 : register, value: value },
      ],
    });

    console.log(`📤 Publishing to Topic: ${topic}`);
    console.log(`📦 Payload: ${payload}`);

    client.publish(topic, payload, (err) => {
      if (err) {
        console.error('❌ Failed to publish:', err.message);
      } else {
        console.log(`✅ Telemetry sent! Watch your browser screen update in real time.`);
      }
      client.end();
    });
  }
});

client.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err.message);
  client.end();
});
