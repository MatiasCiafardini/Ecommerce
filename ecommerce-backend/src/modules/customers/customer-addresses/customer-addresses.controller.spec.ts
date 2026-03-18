import { Test, TestingModule } from '@nestjs/testing';
import { CustomerAddressesController } from './customer-addresses.controller';

describe('CustomerAddressesController', () => {
  let controller: CustomerAddressesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerAddressesController],
    }).compile();

    controller = module.get<CustomerAddressesController>(CustomerAddressesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
