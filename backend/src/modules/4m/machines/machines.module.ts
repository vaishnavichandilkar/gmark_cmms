import { Module } from '@nestjs/common';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { AuditLogModule } from '../../core/audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [MachinesController],
  providers: [MachinesService]
})
export class MachinesModule {}
