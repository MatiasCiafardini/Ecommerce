import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DomainEvent } from '../types/domain-event.type';
import { WebhooksService } from '../../webhooks/services/webhooks/webhooks.service';

@Processor('events')
export class EventsProcessor extends WorkerHost {
  constructor(private readonly webhooksService: WebhooksService) {
    super();
  }

  async process(job: Job<DomainEvent>) {
    const { event, payload, storeId } = job.data;

    switch (event) {
      case 'order.created':
        console.log('Order created event', payload);
        break;

      case 'payment.approved':
        console.log('Payment approved', payload);
        break;

      case 'shipment.created':
        console.log('Shipment created', payload);
        break;

      case 'return.approved':
        console.log('Return approved', payload);
        break;

      default:
        console.log('Unhandled event', event);
    }

    await this.webhooksService.handleEvent(event, storeId, payload);
  }
}
