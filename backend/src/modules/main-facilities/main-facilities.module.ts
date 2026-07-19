import { Module } from '@nestjs/common';
import { MainFacilitiesService } from './main-facilities.service';
import { MainFacilitiesController } from './main-facilities.controller';

@Module({
  providers: [MainFacilitiesService],
  controllers: [MainFacilitiesController]
})
export class MainFacilitiesModule {}
