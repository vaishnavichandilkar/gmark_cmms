import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CodeSequenceService } from '../services/code-sequence.service';

@Global()
@Module({
  providers: [PrismaService, CodeSequenceService],
  exports: [PrismaService, CodeSequenceService],
})
export class PrismaModule {}
