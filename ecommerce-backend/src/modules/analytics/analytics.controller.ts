import { Body, Controller, Get, Put, Post, Req, Query, UseGuards, ForbiddenException, Injectable, ExecutionContext, CanActivate, HttpException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AnalyticsService } from './analytics.service';
@Injectable()
export class AnalyticsAdminGuard implements CanActivate {
 canActivate(context:ExecutionContext){const req=context.switchToHttp().getRequest();if(!['OWNER','ADMIN','SUPER_ADMIN'].includes(req.user?.role)|| (req.user.role!=='SUPER_ADMIN'&&req.user.storeId!==req.storeId))throw new ForbiddenException('No tenés acceso a las métricas de esta tienda');return true;}
}
@Controller('store')
export class AnalyticsController {
 private readonly limits=new Map<string,{at:number;count:number}>();
 constructor(private readonly service:AnalyticsService){}
 @Get('analytics/config') publicConfig(@Req() req){return this.service.config(req.storeId);}
 @Post('analytics/events') ingest(@Req() req,@Body() body:any){
  const key=createHash('sha256').update(`${req.storeId}:${req.ip??''}`).digest('hex');const now=Date.now();
  if(this.limits.size>10000)for(const [key,value] of this.limits)if(now-value.at>60000)this.limits.delete(key);
  const rate=this.limits.get(key);if(rate&&now-rate.at<60000){if(++rate.count>120)throw new HttpException('Demasiados eventos',429);}else this.limits.set(key,{at:now,count:1});
  return this.service.ingest(req.storeId,body);
 }
 @Get('admin/analytics/config') @UseGuards(AdminAuthGuard,AnalyticsAdminGuard) config(@Req() req){return this.service.config(req.storeId);}
 @Put('admin/analytics/config') @UseGuards(AdminAuthGuard,AnalyticsAdminGuard) update(@Req() req,@Body() body:any){return this.service.updateConfig(req.storeId,body);}
 @Get('admin/analytics/overview') @UseGuards(AdminAuthGuard,AnalyticsAdminGuard) overview(@Req() req,@Query() query:Record<string,string>){return this.service.overview(req.storeId,query);}
 @Get('admin/analytics/sessions') @UseGuards(AdminAuthGuard,AnalyticsAdminGuard) sessions(@Req() req,@Query() query:Record<string,string>){return this.service.sessions(req.storeId,query);}
}
