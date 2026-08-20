import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';

import { ParserModule } from '../../scada/parser/parser.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [ParserModule, AlertsModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
