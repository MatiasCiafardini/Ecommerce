import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from '../../services/webhooks/webhooks.service';
import { CreateWebhookDto } from '../../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../../dto/update-webhook.dto';
import { AdminAuthGuard } from '../../../auth/guards/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('admin/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(req.storeId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.webhooksService.findAll(req.storeId);
  }
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.webhooksService.findOne(req.storeId, id);
  }
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(req.storeId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.webhooksService.remove(req.storeId, id);
  }

  @Post('test-event')
  testEvent(@Req() req) {
    console.log('🔥 TEST EVENT ENDPOINT HIT');

    return this.webhooksService.emitTestEvent(req.storeId);
  }
}
