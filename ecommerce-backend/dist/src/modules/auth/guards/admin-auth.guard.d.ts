import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
export declare class AdminAuthGuard extends JwtAuthGuard {
    handleRequest(err: any, user: any, info: any, context: ExecutionContext): any;
}
