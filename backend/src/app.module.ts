import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { DevicesModule } from './modules/devices/devices.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { ParserModule } from './modules/parser/parser.module';

@Module({
  imports: [
    PrismaModule,
    WebsocketModule,
    BuildingsModule,
    DevicesModule,
    MqttModule,
    ParserModule,
  ],
})
export class AppModule {}
