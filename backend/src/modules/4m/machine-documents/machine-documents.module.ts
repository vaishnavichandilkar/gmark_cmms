import { Module } from '@nestjs/common';
import { MachineDocumentsController } from './machine-documents.controller';
import { MachineDocumentsService } from './machine-documents.service';
import { PrismaModule } from '../../../common/prisma/prisma.module';
import { AuthModule } from '../../core/auth/auth.module';
import { AuditLogModule } from '../../core/audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogModule],
  controllers: [MachineDocumentsController],
  providers: [MachineDocumentsService],
  exports: [MachineDocumentsService],
})
export class MachineDocumentsModule {}
