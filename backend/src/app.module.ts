import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { DevicesModule } from './modules/devices/devices.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { ParserModule } from './modules/parser/parser.module';
import { SocietiesModule } from './modules/societies/societies.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { MainFacilitiesModule } from './modules/main-facilities/main-facilities.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { PostalCodesModule } from './modules/postal-codes/postal-codes.module';
import { MachineDocumentsModule } from './modules/machine-documents/machine-documents.module';
import { MachineSpecificationsModule } from './modules/machine-specifications/machine-specifications.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads/',
    }),
    PrismaModule,
    WebsocketModule,
    BuildingsModule,
    DevicesModule,
    SocietiesModule,
    UsersModule,
    MqttModule,
    ParserModule,
    AuthModule,
    AuditLogModule,
    EmployeesModule,
    MainFacilitiesModule,
    FacilitiesModule,
    DesignationsModule,
    PostalCodesModule,
    MachineDocumentsModule,
    MachineSpecificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
