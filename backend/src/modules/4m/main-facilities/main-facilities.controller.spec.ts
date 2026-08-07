import { Test, TestingModule } from '@nestjs/testing';
import { MainFacilitiesController } from './main-facilities.controller';

describe('MainFacilitiesController', () => {
  let controller: MainFacilitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MainFacilitiesController],
    }).compile();

    controller = module.get<MainFacilitiesController>(MainFacilitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
