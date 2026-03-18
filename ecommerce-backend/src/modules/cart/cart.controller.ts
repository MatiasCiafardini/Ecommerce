import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateCartDto } from './dto/create-cart.dto';

@Controller('store/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  createCart(@Req() req: any, @Body() dto: CreateCartDto) {
    return this.cartService.createCart(req.storeId, dto.customerId);
  }

  @Get(':id')
  getCart(@Req() req: any, @Param('id') id: string) {
    return this.cartService.getCart(req.storeId, Number(id));
  }

  @Post(':id/items')
  addItem(@Req() req: any, @Param('id') id: string, @Body() dto: AddItemDto) {
    return this.cartService.addItem(req.storeId, Number(id), dto);
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
      dto,
    );
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(req.storeId, Number(id), Number(itemId));
  }
}
