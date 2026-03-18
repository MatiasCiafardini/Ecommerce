import { Test, TestingModule } from '@nestjs/testing';
import { InventoryLockService } from './inventory-lock.service';

describe('InventoryLockService', () => {
  let service: InventoryLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryLockService],
    }).compile();

    service = module.get<InventoryLockService>(InventoryLockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
