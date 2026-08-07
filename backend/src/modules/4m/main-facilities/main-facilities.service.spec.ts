import { Test, TestingModule } from '@nestjs/testing';
import { MainFacilitiesService } from './main-facilities.service';

describe('MainFacilitiesService', () => {
  let service: MainFacilitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MainFacilitiesService],
    }).compile();

    service = module.get<MainFacilitiesService>(MainFacilitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
