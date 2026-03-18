import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CustomerAddressesService } from './customer-addresses.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';

@ApiTags('Customer Addresses')
@Controller('customer-addresses')
export class CustomerAddressesController {
  constructor(private readonly service: CustomerAddressesService) {}

  @Post()
  create(@Body() dto: CreateCustomerAddressDto) {
    return this.service.create(dto);
  }

  @Get(':customerId')
  findByCustomer(@Param('customerId') customerId: string) {
    return this.service.findByCustomer(Number(customerId));
  }
}
