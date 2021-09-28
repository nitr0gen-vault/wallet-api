import { Test, TestingModule } from '@nestjs/testing';
import { Nitr0genService } from './nitr0gen.service';

describe('Nitr0genService', () => {
  let service: Nitr0genService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Nitr0genService],
    }).compile();

    service = module.get<Nitr0genService>(Nitr0genService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
