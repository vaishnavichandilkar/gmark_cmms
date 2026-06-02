import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MqttGateway } from './mqtt.gateway';

@Module({
  providers: [MqttService, MqttGateway],
  exports: [MqttService, MqttGateway],
})
export class MqttModule {}
