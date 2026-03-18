import { Test, TestingModule } from '@nestjs/testing';
import { WebhookDeliveryService } from './webhook-delivery.service';

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookDeliveryService],
    }).compile();

    service = module.get<WebhookDeliveryService>(WebhookDeliveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
