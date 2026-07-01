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
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Websocket Gateway Initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const authHeader = client.handshake.headers?.authorization;
      let token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }

      if (!token) {
        this.logger.warn(`Client connection rejected: No token provided (${client.id})`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: 'HYPN_ACCESS_SECRET_KEY_2026',
      });

      client.data.user = payload;
      this.logger.log(`Client authenticated: ${client.id} (User: ${payload.email})`);
    } catch (err) {
      this.logger.warn(`Client connection rejected: Invalid token (${client.id})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-device')
  async handleJoinDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { topic: string },
  ) {
    if (!payload || !payload.topic) return;

    const user = client.data.user;
    if (!user) {
      this.logger.warn(`Unauthorized subscription attempt: Unauthenticated socket client`);
      client.disconnect(true);
      return;
    }

    // Resolve the device and building ID
    const device = await this.prisma.device.findFirst({
      where: {
        OR: [
          { topic: payload.topic },
          { deviceId: payload.topic },
        ],
      },
      include: { building: true },
    });

    if (!device) {
      this.logger.warn(`Subscribe attempt to non-existing device/topic: ${payload.topic}`);
      return;
    }

    // Role-based building checks
    let hasAccess = false;
    if (user.role === 'SUPER_ADMIN') {
      hasAccess = true;
    } else if (user.role === 'SOCIETY_ADMIN') {
      hasAccess = device.building.societyId === user.societyId;
    } else {
      hasAccess =
        device.building.societyId === user.societyId &&
        (user.buildingIds || []).includes(device.buildingId);
    }

    if (!hasAccess) {
      this.logger.warn(
        `Access denied: User ${user.email} (${user.role}) is not authorized to join device-${payload.topic}`,
      );
      return;
    }

    client.join(`device-${payload.topic}`);
    this.logger.log(`Client ${client.id} joined room device-${payload.topic}`);
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
