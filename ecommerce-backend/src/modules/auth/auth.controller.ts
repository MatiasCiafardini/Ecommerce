import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { UpdateCurrentAuthDto } from './dto/update-current-auth.dto';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@ApiSecurity('x-store-id')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const storeIdHeader = req.headers['x-store-id'];

    if (!storeIdHeader) {
      throw new Error('x-store-id header is required');
    }

    const storeId = Number(storeIdHeader);

    if (isNaN(storeId)) {
      throw new Error('x-store-id must be a number');
    }

    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      storeId,
    );

    return this.authService.login(user);
  }

  @Post('session-login')
  async loginSession(@Body() body: LoginDto, @Req() req: Request) {
    const storeIdHeader = req.headers['x-store-id'];

    if (!storeIdHeader) {
      throw new Error('x-store-id header is required');
    }

    const storeId = Number(storeIdHeader);

    if (isNaN(storeId)) {
      throw new Error('x-store-id must be a number');
    }

    const authEntity = await this.authService.validateSession(
      body.email,
      body.password,
      storeId,
    );

    return this.authService.login(authEntity);
  }

  @Post('customer/register')
  async registerCustomer(@Body() body: RegisterDto, @Req() req: Request) {
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
      body.firstName,
      body.lastName,
      body.phone,
    );
  }
  @Post('customer/login')
  async loginCustomer(@Body() body: LoginDto, @Req() req: Request) {
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    return this.authService.getCurrentAuthEntity(req.user.sub, req.user.role, req.storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req, @Body() dto: UpdateCurrentAuthDto) {
    return this.authService.updateCurrentAuthEntity(
      req.user.sub,
      req.user.role,
      req.storeId,
      dto,
    );
  }
}
