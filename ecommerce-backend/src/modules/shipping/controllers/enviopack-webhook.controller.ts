import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EnvioPackWebhookService } from '../services/enviopack-webhook.service';
import { EnvioPackWebhookDto } from '../dto/enviopack-webhook.dto';

@Controller('integrations/enviopack')
export class EnvioPackWebhookController {
  constructor(
    private readonly enviopackWebhookService: EnvioPackWebhookService,
  ) {}

  @Get('webhook')
  async receiveGet(@Query() query: EnvioPackWebhookDto) {
    return this.enviopackWebhookService.enqueue(query);
  }

  @Post('webhook')
  async receivePost(@Body() body: EnvioPackWebhookDto) {
    return this.enviopackWebhookService.enqueue(body);
  }
}
