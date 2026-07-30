import { Module } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { DesignationsController } from './designations.controller';

import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DesignationsController],
  providers: [DesignationsService],
})
export class DesignationsModule {}
