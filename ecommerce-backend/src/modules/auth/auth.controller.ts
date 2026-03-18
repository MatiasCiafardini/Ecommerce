import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import type { Request } from 'express';

@ApiTags('auth')
@ApiSecurity('x-store-id')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    return this.authService.login(user);
  }
  @Post('customer/register')
  async registerCustomer(@Body() body: any, @Req() req: Request) {
    const storeIdHeader = req.headers['x-store-id'];

    if (!storeIdHeader) {
      throw new Error('x-store-id header is required');
    }

    const storeId = Number(storeIdHeader);

    if (isNaN(storeId)) {
      throw new Error('x-store-id must be a number');
    }

    return this.authService.registerCustomer(
      body.email,
      body.password,
      storeId,
    );
  }
  @Post('customer/login')
  async loginCustomer(@Body() body: any, @Req() req: Request) {
    const storeIdHeader = req.headers['x-store-id'];

    if (!storeIdHeader) {
      throw new Error('x-store-id header is required');
    }

    const storeId = Number(storeIdHeader);

    const customer = await this.authService.validateCustomer(
      body.email,
      body.password,
      storeId,
    );

    return this.authService.login(customer);
  }
}
