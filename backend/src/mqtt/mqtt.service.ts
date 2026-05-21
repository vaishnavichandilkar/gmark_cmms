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
  private readonly topic = '#'; // Subscribe to all topics

  onModuleInit() {
    this.logger.log(`Attempting to connect to ${this.brokerUrl}...`);

    // Connect to the broker
    this.client = mqtt.connect(this.brokerUrl, {
      username: this.username,
      password: this.password,
      keepalive: 60,
    });

    // Attach callback functions
    this.client.on('connect', this.onConnect.bind(this));
    this.client.on('message', this.onMessage.bind(this));
    this.client.on('error', this.onError.bind(this));
    this.client.on('close', this.onClose.bind(this));
    this.client.on('disconnect', this.onDisconnect.bind(this));
  }

  onModuleDestroy() {
    if (this.client) {
      this.logger.log('Disconnecting from MQTT broker gracefully.');
      this.client.end();
    }
  }

  private onConnect() {
    this.logger.log(`Successfully connected to MQTT broker at ${this.brokerUrl}`);
    
    // Subscribing in on_connect ensures subscriptions are renewed if the connection drops and reconnects
    this.client.subscribe(this.topic, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to topic: ${this.topic}`, err.stack);
      } else {
        this.logger.log(`Subscribed to all topics using wildcard: '${this.topic}'`);
      }
    });
  }

  private onMessage(topic: string, payload: Buffer) {
    try {
      // Try to decode the payload as UTF-8
      const messageStr = payload.toString('utf-8');

      // Prominently display the received data
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📡 NEW MESSAGE RECEIVED`);
      console.log(`${'='.repeat(50)}`);
      console.log(`📍 Topic: ${topic}`);
      console.log(`📦 Data:  ${messageStr}`);
      console.log(`${'='.repeat(50)}\n`);

      // Also keep it in the logs
      this.logger.log(`Message logged on topic ${topic}`);
    } catch (e) {
      // If there's an error in custom parsing/displaying, fallback to raw bytes
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📡 NEW RAW MESSAGE RECEIVED`);
      console.log(`${'='.repeat(50)}`);
      console.log(`📍 Topic: ${topic}`);
      console.log(`📦 Data:  ${payload.toString('hex')} (hex)`);
      console.log(`${'='.repeat(50)}\n`);

      this.logger.log(`Raw message logged on topic ${topic}`);
    }
  }

  private onError(error: Error) {
    this.logger.error(`An unexpected error occurred during connection: ${error.message}`, error.stack);
  }

  private onClose() {
    this.logger.warn(`Connection closed.`);
  }

  private onDisconnect() {
    this.logger.warn('Unexpected disconnection from broker.');
  }
}
