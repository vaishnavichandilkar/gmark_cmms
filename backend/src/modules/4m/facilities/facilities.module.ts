import { Module } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { FacilitiesController } from './facilities.controller';

import { PrismaModule } from '../../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FacilitiesService],
  controllers: [FacilitiesController]
})
export class FacilitiesModule {}
