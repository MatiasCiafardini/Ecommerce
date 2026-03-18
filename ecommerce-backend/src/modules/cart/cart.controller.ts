import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('store/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  createCart(@Req() req: any, @Body() _dto: CreateCartDto) {
    return this.cartService.createCart(req.storeId, req.user.sub);
  }

  @Get(':id')
  getCart(@Req() req: any, @Param('id') id: string) {
    return this.cartService.getCart(req.storeId, Number(id), req.user.sub);
  }

  @Post(':id/items')
  addItem(@Req() req: any, @Param('id') id: string, @Body() dto: AddItemDto) {
    return this.cartService.addItem(
      req.storeId,
      Number(id),
      req.user.sub,
      dto,
    );
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(
      req.storeId,
      Number(id),
      Number(itemId),
      req.user.sub,
      dto,
    );
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(
      req.storeId,
      Number(id),
      Number(itemId),
      req.user.sub,
    );
  }

  @Delete(':id/items')
  clearCart(@Req() req: any, @Param('id') id: string) {
    return this.cartService.clearCart(req.storeId, Number(id), req.user.sub);
  }
}
