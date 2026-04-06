import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { UpdateCurrentAuthDto } from './dto/update-current-auth.dto';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { clearAuthCookie, setAuthCookie } from './utils/auth-cookie.util';

@ApiTags('auth')
@ApiSecurity('x-store-id')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const storeId = this.readStoreId(req);

    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      storeId,
    );

    return this.finishLogin(res, user);
  }

  @Post('session-login')
  async loginSession(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const storeId = this.readStoreId(req);

    const authEntity = await this.authService.validateSession(
      body.email,
      body.password,
      storeId,
    );

    return this.finishLogin(res, authEntity);
  }

  @Post('customer/register')
  async registerCustomer(@Body() body: RegisterDto, @Req() req: Request) {
    const storeId = this.readStoreId(req);

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
  async loginCustomer(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const storeId = this.readStoreId(req);

    const customer = await this.authService.validateCustomer(
      body.email,
      body.password,
      storeId,
    );

    return this.finishLogin(res, customer);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res, 'store');
    return { success: true };
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

  private readStoreId(req: Request) {
    const storeIdHeader = req.headers['x-store-id'];
    const rawValue = Array.isArray(storeIdHeader) ? storeIdHeader[0] : storeIdHeader;

    if (!rawValue) {
      throw new BadRequestException('x-store-id header is required');
    }

    const storeId = Number(rawValue);

    if (!Number.isInteger(storeId) || storeId <= 0) {
      throw new BadRequestException('x-store-id must be a positive integer');
    }

    return storeId;
  }

  private async finishLogin(res: Response, authEntity: any) {
    const payload = await this.authService.login(authEntity);
    setAuthCookie(res, payload.access_token, 'store');

    return {
      user: payload.user,
    };
  }
}
