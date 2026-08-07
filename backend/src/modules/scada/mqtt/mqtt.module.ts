import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';

import { ParserModule } from '../../scada/parser/parser.module';

@Module({
  imports: [ParserModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
