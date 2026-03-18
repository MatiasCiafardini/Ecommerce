import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import * as crypto from 'crypto';

@Processor('webhook-delivery')
export class WebhookDeliveryService extends WorkerHost {
  async process(job: Job<any>) {
    const { url, secret, event, payload } = job.data;

    const body = JSON.stringify(payload);

    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    try {
      await axios.post(url, payload, {
        headers: {
          'x-webhook-event': event,
          'x-webhook-signature': signature,
          'Content-Type': 'application/json',
        },
      });

      console.log('Webhook delivered:', url);

      return true;
    } catch (error) {
      console.error('Webhook delivery failed:', error.message);
      throw error;
    }
  }
}
