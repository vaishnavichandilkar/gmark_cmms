import { Test, TestingModule } from '@nestjs/testing';
import { MachineSpecificationsService } from './machine-specifications.service';

describe('MachineSpecificationsService', () => {
  let service: MachineSpecificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MachineSpecificationsService],
    }).compile();

    service = module.get<MachineSpecificationsService>(MachineSpecificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
