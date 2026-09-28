import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { AlertsEmailService } from './email.service';
import { AlertsEscalationService } from './alerts-escalation.service';

@Module({
  imports: [WebsocketModule],
  providers: [AlertsService, AlertsEmailService, AlertsEscalationService],
  controllers: [AlertsController],
  exports: [AlertsService, AlertsEmailService, AlertsEscalationService],
})
export class AlertsModule {}

