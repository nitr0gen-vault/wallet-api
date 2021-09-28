import { Test, TestingModule } from '@nestjs/testing';
import { TronController } from './tron.controller';

describe('TronController', () => {
  let controller: TronController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TronController],
    }).compile();

    controller = module.get<TronController>(TronController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
