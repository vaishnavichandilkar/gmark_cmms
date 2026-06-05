import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;

  // --- Configuration ---
  private readonly brokerUrl = 'mqtt://mqtt.gmarksoftware.com:1883';
  private readonly username = 'admin';
  private readonly password = 'admin123';
  // private readonly topics = '#';

  private readonly topics = [
    'AGC/SE-20260508012',
    'AGC/SE-20260508045',
    'AGC/SE-2026051104',
    'AGC/SE-20260506027',
    'AGC/SE-20260506023',
    'AGC/SE-20260506029',
    'AGC/SE-20260506030',
    'AGC/SE-2026050913',
    'AGC/SE-2026050907',
    'AGC/SE-2026050909',
    'AGC/SE-202605034',
    'AGC/SE-20260508013',
    'AGC/SE-20260526020',
    'AGC/SE-2026050805',
    'AGC/SE-20260508011',
    'AGC/SE-2026050910',
    'AGC/SE-2026050904',
    'AGC/SE-2026050902',
    'AGC/SE-2026051111',
    'AGC/SE-20260506036',
    'AGC/SE-2026051127',
    'AGC/SE-2026051115',
    'AGC/SE-2026051133',
    'AGC/SE-20260508010',
    'AGC/SE-20260526021',
    'AGC/SE-2026050901',
    'AGC/SE-20260223035',
    'AGC/SE-2026052022',
    'AGC/SE-20260526023',
  ];

  onModuleInit() {
    this.client = mqtt.connect(this.brokerUrl, {
      username: this.username,
      password: this.password,
      keepalive: 60,
    });

    this.client.on('connect', this.onConnect.bind(this));
    this.client.on('message', this.onMessage.bind(this));
    this.client.on('error', this.onError.bind(this));
    this.client.on('close', this.onClose.bind(this));
    this.client.on('disconnect', this.onDisconnect.bind(this));
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private onConnect() {
    console.log('\n[Nest] MQTT Connected\n');

    this.client.subscribe(this.topics, (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to topics', err.stack);
      } else {
        if (Array.isArray(this.topics)) {
          this.topics.forEach((topic) => {
            console.log(`[Nest] Subscribed:\n${topic}\n`);
          });
        } else {
          console.log(`[Nest] Subscribed:\n${this.topics}\n`);
        }
      }
    });
  }

  private onMessage(topic: string, payload: Buffer) {
    const messageStr = payload.toString('utf-8');

    // Format timestamp
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Extract device ID from topic
    const deviceParts = topic.split('/');
    const deviceId = deviceParts.length > 1 ? deviceParts[deviceParts.length - 1] : topic;

    try {
      const parsed = JSON.parse(messageStr);
      let registerObject: Record<string, any> = {};

      if (parsed && Array.isArray(parsed.registers)) {
        parsed.registers.forEach((item: any) => {
          if (item.register !== undefined && item.value !== undefined) {
            registerObject[item.register] = item.value;
          }
        });
      } else if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item.register !== undefined && item.value !== undefined) {
            registerObject[item.register] = item.value;
          }
        });
      }

      const keys = Object.keys(registerObject);
      if (keys.length > 0) {
        console.log(`\n[MQTT] Device: ${deviceId}`);
        console.log(`[MQTT] Topic: ${topic}`);
        console.log(`[MQTT] Timestamp: ${timestamp}`);
        console.log(`[MQTT] Registers Received: ${keys.length}\n`);

        const CHUNK_SIZE = 30;
        for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
          const chunkKeys = keys.slice(i, i + CHUNK_SIZE);
          const chunkObj: Record<string, any> = {};
          chunkKeys.forEach(k => {
            chunkObj[k] = registerObject[k];
          });
          // Pass as an array of one item to make it horizontal
          console.table([chunkObj]);
        }
        return; // Early return if we successfully parsed registers
      }
    } catch (e) {
      // Not JSON, fallback to basic logging
    }

    // Fallback for non-register payloads
    console.log(`\n[MQTT] Device: ${deviceId}`);
    console.log(`[MQTT] Topic: ${topic}`);
    console.log(`[MQTT] Timestamp: ${timestamp}`);
    console.log(`[MQTT] Payload: ${messageStr.length > 200 ? messageStr.substring(0, 197) + '...' : messageStr}\n`);
  }

  private onError(error: Error) {
    this.logger.error(`MQTT Error: ${error.message}`, error.stack);
  }

  private onClose() {
    this.logger.warn(`MQTT Connection closed.`);
  }

  private onDisconnect() {
    this.logger.warn('MQTT Disconnected.');
  }
}
