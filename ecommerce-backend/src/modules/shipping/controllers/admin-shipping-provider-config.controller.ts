import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { StoreShippingProviderConfigService } from '../services/store-shipping-provider-config.service';
import { UpdateStoreShippingProviderStatusDto } from '../dto/update-store-shipping-provider-status.dto';
import { UpsertStoreShippingProviderConfigDto } from '../dto/upsert-store-shipping-provider-config.dto';
import { UpdateStoreShippingProviderConfigDto } from '../dto/update-store-shipping-provider-config.dto';

@UseGuards(AdminAuthGuard)
@Controller('admin/shipping/providers')
export class AdminShippingProviderConfigController {
  constructor(
    private readonly storeShippingProviderConfigService: StoreShippingProviderConfigService,
  ) {}

  @Get()
  findAll(@Req() req: { storeId: number }) {
    return this.storeShippingProviderConfigService.findAll(req.storeId);
  }

  @Get(':id')
  findOne(@Req() req: { storeId: number }, @Param('id') id: string) {
    return this.storeShippingProviderConfigService.findOne(req.storeId, id);
  }

  @Post()
  upsert(
    @Req() req: { storeId: number },
    @Body() dto: UpsertStoreShippingProviderConfigDto,
  ) {
    return this.storeShippingProviderConfigService.createOrUpdate(
      req.storeId,
      {
        provider: dto.provider,
        ...this.mapDto(dto),
      },
    );
  }

  @Patch(':id')
  update(
    @Req() req: { storeId: number },
    @Param('id') id: string,
    @Body() dto: UpdateStoreShippingProviderConfigDto,
  ) {
    return this.storeShippingProviderConfigService.updateById(
      req.storeId,
      id,
      this.mapDto(dto),
    );
  }

  @Post(':id/enabled')
  setEnabled(
    @Req() req: { storeId: number },
    @Param('id') id: string,
    @Body() dto: UpdateStoreShippingProviderStatusDto,
  ) {
    return this.storeShippingProviderConfigService.setEnabled(
      req.storeId,
      id,
      dto.enabled,
    );
  }

  @Post(':id/default')
  setDefault(@Req() req: { storeId: number }, @Param('id') id: string) {
    return this.storeShippingProviderConfigService.setDefault(req.storeId, id);
  }

  @Post(':id/test-connection')
  testConnection(@Req() req: { storeId: number }, @Param('id') id: string) {
    return this.storeShippingProviderConfigService.testConnection(
      req.storeId,
      id,
    );
  }

  private mapDto(
    dto: UpsertStoreShippingProviderConfigDto | UpdateStoreShippingProviderConfigDto,
  ) {
    return {
      ...dto,
      metadata:
        dto.metadata === undefined
          ? undefined
          : (dto.metadata as Prisma.InputJsonValue),
    };
  }
}
