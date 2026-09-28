import { Module } from '@nestjs/common';
import { MachinesController } from './machines.controller';
import { PublicMachinesController } from './public-machines.controller';
import { MachinesService } from './machines.service';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { AuditLogModule } from '../../core/audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [MachinesController, PublicMachinesController],
  providers: [MachinesService],
  exports: [MachinesService],
})
export class MachinesModule {}
