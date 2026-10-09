import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsAdminGuard,AnalyticsController } from './analytics.controller';
@Module({imports:[PrismaModule],controllers:[AnalyticsController],providers:[AnalyticsService,AnalyticsAdminGuard],exports:[AnalyticsService]})
export class AnalyticsModule {}
