import { Test, TestingModule } from '@nestjs/testing';
import { OrderManagementController } from './order-management.controller';

describe('OrderManagementController', () => {
  let controller: OrderManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderManagementController],
    }).compile();

    controller = module.get<OrderManagementController>(OrderManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
