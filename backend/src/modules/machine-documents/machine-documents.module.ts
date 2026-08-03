import { Module } from '@nestjs/common';
import { MachineDocumentsController } from './machine-documents.controller';
import { MachineDocumentsService } from './machine-documents.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditLogModule],
  controllers: [MachineDocumentsController],
  providers: [MachineDocumentsService],
  exports: [MachineDocumentsService],
})
export class MachineDocumentsModule {}
