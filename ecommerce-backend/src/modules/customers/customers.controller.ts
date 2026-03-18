import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(req.storeId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.customersService.findAll(req.storeId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.customersService.findOne(req.storeId, Number(id));
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(req.storeId, Number(id), dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.customersService.remove(req.storeId, Number(id));
  }
}
