import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { CreateStoreShippingMethodDto } from '../dto/create-store-shipping-method.dto';
import { ReorderStoreShippingMethodsDto } from '../dto/reorder-store-shipping-methods.dto';
import { UpdateStoreShippingMethodDto } from '../dto/update-store-shipping-method.dto';
import { UpdateStoreShippingMethodStatusDto } from '../dto/update-store-shipping-method-status.dto';
import { StoreShippingMethodsService } from '../services/store-shipping-methods.service';

@UseGuards(AdminAuthGuard)
@Controller('admin/shipping/methods')
export class AdminStoreShippingMethodsController {
  constructor(
    private readonly storeShippingMethodsService: StoreShippingMethodsService,
  ) {}

  @Get()
  findAll(
    @Req() req: { storeId: number },
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.storeShippingMethodsService.findAll(
      req.storeId,
      includeArchived === 'true',
    );
  }

  @Get(':id')
  findOne(@Req() req: { storeId: number }, @Param('id') id: string) {
    return this.storeShippingMethodsService.findOne(req.storeId, id);
  }

  @Post()
  create(
    @Req() req: { storeId: number },
    @Body() dto: CreateStoreShippingMethodDto,
  ) {
    return this.storeShippingMethodsService.create(req.storeId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: { storeId: number },
    @Param('id') id: string,
    @Body() dto: UpdateStoreShippingMethodDto,
  ) {
    return this.storeShippingMethodsService.update(req.storeId, id, dto);
  }

  @Post(':id/active')
  setActive(
    @Req() req: { storeId: number },
    @Param('id') id: string,
    @Body() dto: UpdateStoreShippingMethodStatusDto,
  ) {
    return this.storeShippingMethodsService.setActive(req.storeId, id, dto.active);
  }

  @Post('reorder')
  reorder(
    @Req() req: { storeId: number },
    @Body() dto: ReorderStoreShippingMethodsDto,
  ) {
    return this.storeShippingMethodsService.reorder(req.storeId, dto.items);
  }

  @Delete(':id')
  archive(@Req() req: { storeId: number }, @Param('id') id: string) {
    return this.storeShippingMethodsService.archive(req.storeId, id);
  }
}
