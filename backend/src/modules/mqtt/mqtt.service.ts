import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);
  
  // --- Configuration ---
  private readonly brokerUrl = 'mqtt://mqtt.gmarksoftware.com:1883';
  private readonly username = 'admin';
  private readonly password = 'admin123';
  
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  onModuleInit() {
    this.logger.log(`Connecting to MQTT broker at ${this.brokerUrl}`);
    this.client = mqtt.connect(this.brokerUrl, {
      username: this.username,
      password: this.password,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      
      this.client.subscribe(this.topics, (err) => {
        if (err) {
          this.logger.error(`Subscription error: ${err.message}`);
        } else {
          this.logger.log(`Subscribed to ${this.topics.length} specific topics`);
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        const messageString = message.toString();
        let payload: any;
        
        // Check if the message contains a JSON object
        const startIdx = messageString.indexOf('{');
        if (startIdx !== -1) {
          const jsonStr = messageString.substring(startIdx);
          payload = JSON.parse(jsonStr);
        } else {
          // Fallback to normal JSON parse
          payload = JSON.parse(messageString);
        }

        this.logger.debug(`Received message on ${topic}:`, payload);
        await this.handleMessage(topic, payload);
      } catch (error) {
        this.logger.error(`Failed to process message on ${topic}:`, error);
      }
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT Client Error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private async handleMessage(topic: string, payload: any) {
    // Example topic: AGC/SE-2026050901 or AGC/2026050901
    // Extract deviceId from topic.
    const parts = topic.split('/');
    if (parts.length < 2) return;
    
    let deviceId = parts[1];
    
    // Some devices might have 'SE-' prefix, remove it to match db id if necessary.
    if (deviceId.startsWith('SE-')) {
      deviceId = deviceId.substring(3);
    }

    const { timestamp, registers } = payload;

    // Update in database
    try {
      const device = await this.prisma.device.update({
        where: { deviceId },
        data: {
          latestData: payload, // Stores the entire JSON payload, or just { registers, timestamp }
          updatedAt: new Date(),
        },
      });

      if (device) {
        // Emit via websocket
        this.websocketGateway.emitDeviceUpdate(deviceId, registers || []);
      }
    } catch (error) {
      // It's possible the device doesn't exist in the database, ignore or log
      this.logger.warn(`Device ${deviceId} not found or failed to update`);
    }
  }
}
