import { Module } from '@nestjs/common';
import { PostalCodesController } from './postal-codes.controller';
import { PostalCodesService } from './postal-codes.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PostalCodesController],
  providers: [PostalCodesService],
  exports: [PostalCodesService],
})
export class PostalCodesModule {}
