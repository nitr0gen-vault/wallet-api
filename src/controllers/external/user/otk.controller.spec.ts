import { Test, TestingModule } from '@nestjs/testing';
import { OtkController } from './otk.controller';

describe('OtkController', () => {
  let controller: OtkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtkController],
    }).compile();

    controller = module.get<OtkController>(OtkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
