import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { BuildingsModule } from './modules/4m/buildings/buildings.module';
import { DevicesModule } from './modules/scada/devices/devices.module';
import { MqttModule } from './modules/scada/mqtt/mqtt.module';
import { WebsocketModule } from './modules/scada/websocket/websocket.module';
import { ParserModule } from './modules/scada/parser/parser.module';
import { SocietiesModule } from './modules/4m/societies/societies.module';
import { UsersModule } from './modules/4m/users/users.module';
import { AuthModule } from './modules/core/auth/auth.module';
import { AuditLogModule } from './modules/core/audit-log/audit-log.module';
import { EmployeesModule } from './modules/4m/employees/employees.module';
import { MainFacilitiesModule } from './modules/4m/main-facilities/main-facilities.module';
import { FacilitiesModule } from './modules/4m/facilities/facilities.module';
import { DesignationsModule } from './modules/4m/designations/designations.module';
import { PostalCodesModule } from './modules/4m/postal-codes/postal-codes.module';
import { MachineDocumentsModule } from './modules/4m/machine-documents/machine-documents.module';
import { MachineSpecificationsModule } from './modules/4m/machine-specifications/machine-specifications.module';
import { MachinesModule } from './modules/4m/machines/machines.module';
import { AlertsModule } from './modules/scada/alerts/alerts.module';
import { WorkOrdersModule } from './modules/4m/work-orders/work-orders.module';
import { SparePartsModule } from './modules/4m/spare-parts/spare-parts.module';
import { SchedulesModule } from './modules/4m/schedules/schedules.module';
import { CheckpointsModule } from './modules/4m/checkpoints/checkpoints.module';

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
    AlertsModule,
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
    MachinesModule,
    WorkOrdersModule,
    SparePartsModule,
    SchedulesModule,
    CheckpointsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
