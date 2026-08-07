import { Module } from '@nestjs/common';
import { MachineSpecificationsController } from './machine-specifications.controller';
import { MachineSpecificationsService } from './machine-specifications.service';
import { PrismaModule } from '../../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MachineSpecificationsController],
  providers: [MachineSpecificationsService]
})
export class MachineSpecificationsModule {}
