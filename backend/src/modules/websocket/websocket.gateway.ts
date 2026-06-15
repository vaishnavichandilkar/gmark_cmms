import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebsocketGateway');

  afterInit(server: Server) {
    this.logger.log('Websocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-device')
  handleJoinDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { topic: string },
  ) {
    if (payload && payload.topic) {
      client.join(`device-${payload.topic}`);
      this.logger.log(
        `Client ${client.id} joined room device-${payload.topic}`,
      );
    }
  }

  @SubscribeMessage('leave-device')
  handleLeaveDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { topic: string },
  ) {
    if (payload && payload.topic) {
      client.leave(`device-${payload.topic}`);
      this.logger.log(`Client ${client.id} left room device-${payload.topic}`);
    }
  }

  emitDeviceUpdate(
    topic: string,
    deviceId: string,
    registers: any[],
    rawRegisters?: any[],
  ) {
    this.server
      .to(`device-${topic}`)
      .to(`device-${deviceId}`)
      .emit('device-update', {
        deviceId,
        registers,
        rawRegisters,
      });
  }
}
