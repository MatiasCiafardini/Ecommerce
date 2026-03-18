import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CustomerAddressesService } from './customer-addresses.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Customer Addresses')
@UseGuards(JwtAuthGuard)
@Controller('customer-addresses')
export class CustomerAddressesController {
  constructor(private readonly service: CustomerAddressesService) {}

  @Post('me')
  create(@Req() req, @Body() dto: CreateCustomerAddressDto) {
    return this.service.create(req.storeId, req.user.sub, dto);
  }

  @Get('me')
  findMine(@Req() req) {
    return this.service.findByCustomer(req.storeId, req.user.sub);
  }

  @Patch('me/:id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCustomerAddressDto) {
    return this.service.update(req.storeId, req.user.sub, Number(id), dto);
  }

  @Delete('me/:id')
  remove(@Req() req, @Param('id') id: string) {
    return this.service.remove(req.storeId, req.user.sub, Number(id));
  }
}
