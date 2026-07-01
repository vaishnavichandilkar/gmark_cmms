import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WebsocketGateway } from './websocket.gateway';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Global()
@Module({
  imports: [JwtModule.register({}), PrismaModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
