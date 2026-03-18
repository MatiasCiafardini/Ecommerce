import { Test, TestingModule } from '@nestjs/testing';
import { OrderManagementService } from './order-management.service';

describe('OrderManagementService', () => {
  let service: OrderManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderManagementService],
    }).compile();

    service = module.get<OrderManagementService>(OrderManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
