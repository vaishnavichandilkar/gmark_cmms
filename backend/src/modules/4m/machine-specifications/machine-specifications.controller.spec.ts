import { Test, TestingModule } from '@nestjs/testing';
import { MachineSpecificationsController } from './machine-specifications.controller';

describe('MachineSpecificationsController', () => {
  let controller: MachineSpecificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachineSpecificationsController],
    }).compile();

    controller = module.get<MachineSpecificationsController>(MachineSpecificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
